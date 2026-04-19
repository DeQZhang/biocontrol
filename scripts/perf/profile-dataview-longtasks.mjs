import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require(require.resolve('playwright', { paths: [path.resolve('frontend')] }))

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8080/api'
const WEB_BASE = process.env.WEB_BASE || 'http://127.0.0.1:5173'
const DATAVIEW_PERF_STORAGE_KEY = 'dataview.perf.enabled'
const SEARCH_LIGHT_RENDER_STORAGE_KEY = 'dataview.perf.searchLight'
const metadataPath = path.resolve('scripts/perf/.dataview-seed.json')
const outputPath = path.resolve('scripts/perf/.dataview-longtasks.json')
const WAIT_AFTER_INTERACTION_MS = Number(process.env.PERF_WAIT_AFTER_INTERACTION_MS || 700)
const SEARCH_INPUT_DEBOUNCE_MS = Number(process.env.PERF_SEARCH_INPUT_DEBOUNCE_MS || 180)
const SEARCH_LIGHT_RENDER_ENABLED = process.env.PERF_SEARCH_LIGHT_RENDER === '1'
const HOVER_POPOVER_WAIT_MS = Number(process.env.PERF_HOVER_POPOVER_WAIT_MS || 300)

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizeInlineText = (value) => String(value || '').replace(/\s+/g, ' ').trim()

const shortenText = (value, maxLength = 72) => {
  const text = normalizeInlineText(value)
  if (text.length <= maxLength) {
    return text
  }
  return `${text.slice(0, Math.max(0, maxLength - 3))}...`
}

const firstMatch = (text, patterns) => {
  for (const pattern of patterns) {
    if (!pattern) {
      continue
    }
    const match = text.match(pattern)
    if (match?.[1]) {
      return match[1]
    }
    if (match?.[0]) {
      return match[0]
    }
  }
  return ''
}

const normalizeSelectedNodeLabel = (key, rawValue, metadata = {}) => {
  const text = normalizeInlineText(rawValue)
  if (!text) {
    return ''
  }

  const exactNames = {
    product: metadata.productName,
    strain: metadata.strainName,
    experiment: metadata.designName,
    batch: metadata.batchName,
  }
  const baseKey = String(key || '').replace(/\d+$/, '')
  const exactName = exactNames[baseKey]
  if (exactName && text.includes(exactName)) {
    return exactName
  }

  const prefix = metadata?.prefix ? escapeRegExp(metadata.prefix) : null
  const patternsByKey = {
    product: [
      prefix ? new RegExp(`(${prefix}-P\\d{2})(?=\\d+\\/\\d+)`, 'i') : null,
      prefix ? new RegExp(`(${prefix}-P\\d{2,})`, 'i') : null,
      /([A-Za-z0-9-]+-P\d{2})(?=\d+\/\d+|\b)/,
    ],
    strain: [
      prefix ? new RegExp(`(${prefix}-P\\d{2}-S\\d{2})`, 'i') : null,
      /([A-Za-z0-9-]+-P\d{2}-S\d{2})/,
    ],
    experiment: [
      prefix ? new RegExp(`(${prefix}-P\\d{2}-S\\d{2}-D\\d{2})`, 'i') : null,
      /([A-Za-z0-9-]+-P\d{2}-S\d{2}-D\d{2})/,
    ],
    batch: [
      prefix ? new RegExp(`(${prefix}-P\\d{2}-S\\d{2}-D\\d{2}-B\\d{2})`, 'i') : null,
      /([A-Za-z0-9-]+-P\d{2}-S\d{2}-D\d{2}-B\d{2})/,
    ],
  }

  const extracted = firstMatch(text, patternsByKey[baseKey] || [])
  if (extracted) {
    return extracted
  }

  if (baseKey === 'batch') {
    const vessel = firstMatch(text, [/(发酵罐|摇瓶|孔板|微孔板|fermenter|shake[- ]flask|microplate)/i])
    if (vessel) {
      return shortenText(vessel, 24)
    }
  }

  return shortenText(text)
}

const cleanSelectedNodes = (selectedNodes, metadata) => {
  return Object.entries(selectedNodes || {}).reduce((accumulator, [key, value]) => {
    const normalized = normalizeSelectedNodeLabel(key, value, metadata)
    if (normalized) {
      accumulator[key] = normalized
    }
    return accumulator
  }, {})
}

const compactLongTask = (item) => {
  if (!item) {
    return undefined
  }

  return pruneEmpty({
    stage: item?.stage,
    durationMs: Number(item?.duration || 0),
    startTimeMs: item?.startTime,
    name: item?.name,
  })
}

const compactPerfRecord = (item) => {
  return pruneEmpty({
    scope: item?.scope,
    name: item?.name,
    stage: item?.stage,
    durationMs: Number(item?.durationMs || 0),
    failed: item?.failed || undefined,
  })
}

const pruneEmpty = (value) => {
  if (Array.isArray(value)) {
    const next = value
      .map((item) => pruneEmpty(item))
      .filter((item) => item !== undefined)
    return next.length ? next : undefined
  }

  if (value && typeof value === 'object') {
    const next = Object.entries(value).reduce((accumulator, [key, item]) => {
      const normalized = pruneEmpty(item)
      if (normalized !== undefined) {
        accumulator[key] = normalized
      }
      return accumulator
    }, {})
    return Object.keys(next).length ? next : undefined
  }

  if (value === null || value === '') {
    return undefined
  }

  return value
}

const buildReadableResult = (result, metadata) => {
  const allLongTasks = Array.isArray(result.allLongTasks) ? result.allLongTasks : []
  const totalLongTaskDurationMs = Number(allLongTasks
    .reduce((sum, item) => sum + Number(item?.duration || 0), 0)
    .toFixed(3))
  const worstLongTask = allLongTasks.reduce((max, item) => {
    return Number(item?.duration || 0) > Number(max?.duration || 0) ? item : max
  }, null)
  const cleanedSelectedNodes = cleanSelectedNodes(result.selectedNodes, metadata)

  return pruneEmpty({
    summary: {
      prefix: result.prefix,
      datasetMode: result.datasetMode,
      renderMode: result.renderMode,
      rowsVisible: result.rowsVisible,
    },
    scale: result.scale,
    selection: cleanedSelectedNodes,
    search: result.searchBreakdown ? {
      timings: {
        debounceMs: result.searchBreakdown.debounceMs,
        totalDurationMs: result.searchBreakdown.totalDurationMs,
        computeDurationMs: result.searchBreakdown.computeDurationMs,
        firstScreenRenderMs: result.searchBreakdown.firstScreenRenderMs,
      },
      renderCost: {
        filteredTreeDataMs: result.searchBreakdown.filteredTreeDataMs,
        flatRowStateMs: result.searchBreakdown.flatRowStateMs,
        autoExpandDecisionMs: result.searchBreakdown.autoExpandDecisionMs,
        domCommitMs: result.searchBreakdown.domCommitMs,
      },
      runtime: {
        perfRecordCount: result.searchBreakdown.perfRecordCount,
        longTaskCount: result.searchBreakdown.longTaskCount,
        totalLongTaskDurationMs: result.searchBreakdown.totalLongTaskDurationMs,
      },
    } : null,
    interaction: {
      hoverReport: result.hoverReport,
      chartState: result.chartState,
    },
    runtime: {
      observer: result.observer,
      longTasks: {
        count: allLongTasks.length,
        totalDurationMs: totalLongTaskDurationMs,
        worst: compactLongTask(worstLongTask),
        top: (result.topLongTasks || []).map(compactLongTask),
      },
      perf: result.perf?.recordCount ? {
        enabled: result.perf.enabled,
        storageKey: result.perf.storageKey,
        recordCount: result.perf.recordCount,
        topRecords: (result.perf.topRecords || []).slice(0, 10).map(compactPerfRecord),
        summaryByOp: (result.perf.summaryByOp || []).slice(0, 10),
        summaryByStage: result.perf.summaryByStage || [],
      } : {
        enabled: result.perf?.enabled,
        storageKey: result.perf?.storageKey,
        recordCount: result.perf?.recordCount,
      },
    },
    stages: (result.stages || []).map((item) => pruneEmpty({
      stage: item.stage,
      durationMs: item.durationMs,
      longTaskCount: item.longTaskCount,
      totalLongTaskDurationMs: item.totalLongTaskDuration,
      worstLongTask: compactLongTask(item.worstLongTask),
    })),
  })
}

const requestJson = async (pathname, options = {}) => {
  const response = await fetch(`${API_BASE}${pathname}`, {
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const text = await response.text()
  let payload = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = text
  }

  if (!response.ok) {
    throw new Error(`${pathname} -> ${response.status}: ${typeof payload === 'string' ? payload : JSON.stringify(payload)}`)
  }

  return payload
}

const apiGet = (pathname) => requestJson(pathname)
const apiPost = (pathname, data) => requestJson(pathname, { method: 'POST', body: JSON.stringify(data) })
const apiDeleteQuiet = async (pathname) => {
  try {
    await requestJson(pathname, { method: 'DELETE' })
  } catch {
    // ignore cleanup failures
  }
}

const ensureAdmin = async () => {
  await apiPost('/users/admin/init', {})
  const payload = await apiGet('/users')
  return (payload.data || []).find((item) => item.account === 'Admin') || (payload.data || [])[0]
}

const readMetadata = async () => {
  try {
    const raw = await fs.readFile(metadataPath, 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null
    }
    throw error
  }
}

const createTargetedFixture = async (admin) => {
  const suffix = `LT-${Date.now().toString(36).slice(-6)}`
  const productName = `${suffix}-P`
  const strainName = `${suffix}-S`
  const designName = `${suffix}-D`
  const batchName = `${suffix}-B`

  const cleanupState = {
    product: null,
    strain: null,
    design: null,
    batch: null,
  }

  await apiPost('/products', {
    name: productName,
    info: 'DV lt fixture',
  })
  cleanupState.product = (await apiGet('/products')).data.find((item) => item.name === productName) || null

  await apiPost('/strains', {
    product_id: cleanupState.product.id,
    name: strainName,
    info: 'DV lt fixture',
  })
  cleanupState.strain = (await apiGet('/strains')).data.find((item) => item.name === strainName) || null

  await apiPost('/experiment-designs', {
    name: designName,
    vessel_type: 'fermenter',
    product_id: cleanupState.product.id,
    strain_id: cleanupState.strain.id,
    user_id: admin.id,
    previous_experiment_design_id: 0,
    design_background: 'DV lt fixture',
    design_items: JSON.stringify([{ batch_no: '01', plan: `${designName}-P`, note: `${designName}-N` }]),
    design_detail: `${designName}-F`,
    design_date: '2026-04-14',
    experiment_eval: '',
    experiment_conclusion: '',
    next_step_plan: '',
    create_time: '2026-04-14 10:00:00',
  })
  cleanupState.design = (await apiGet('/experiment-designs')).data.find((item) => item.name === designName) || null

  await apiPost('/batches', {
    batch_name: batchName,
    experiment_design_id: cleanupState.design.id,
    vessel_type: 'fermenter',
    design_detail: `${designName}-F`,
    design_date: '2026-04-14',
    experiment_eval: '',
    experiment_conclusion: '',
    user_id: admin.id,
    product_id: cleanupState.product.id,
    strain_id: cleanupState.strain.id,
    create_time: '2026-04-14 10:00:00',
    start_time: '2026-04-14 10:00:00',
    end_time: '2026-04-14 12:00:00',
    info: 'DV lt fixture',
  })
  cleanupState.batch = (await apiGet('/batches')).data.find((item) => item.batch_name === batchName) || null

  return {
    prefix: suffix,
    productName,
    strainName,
    designName,
    batchName,
    scale: { targetedFixture: true },
    cleanupState,
  }
}

const cleanupTargetedFixture = async (fixture) => {
  if (!fixture?.cleanupState) {
    return
  }

  if (fixture.cleanupState.batch?.id) {
    await apiDeleteQuiet(`/batches/${fixture.cleanupState.batch.id}`)
  }
  if (fixture.cleanupState.design?.id) {
    await apiDeleteQuiet(`/experiment-designs/${fixture.cleanupState.design.id}`)
  }
  if (fixture.cleanupState.strain?.id) {
    await apiDeleteQuiet(`/strains/${fixture.cleanupState.strain.id}`)
  }
  if (fixture.cleanupState.product?.id) {
    await apiDeleteQuiet(`/products/${fixture.cleanupState.product.id}`)
  }
}

const buildWindowInitScript = () => {
  return () => {
    window.__dvProfiler = {
      longTasks: [],
      marks: [],
      currentStage: 'bootstrap',
    }

    const pushMark = (label) => {
      window.__dvProfiler.marks.push({
        label,
        timestamp: performance.now(),
      })
    }

    window.__dvProfiler.setStage = (stage) => {
      window.__dvProfiler.currentStage = stage
      pushMark(`stage:${stage}`)
    }

    window.__dvProfiler.flush = () => ({
      longTasks: [...window.__dvProfiler.longTasks],
      marks: [...window.__dvProfiler.marks],
      currentStage: window.__dvProfiler.currentStage,
    })

    pushMark('bootstrap:init')

    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            window.__dvProfiler.longTasks.push({
              name: entry.name,
              entryType: entry.entryType,
              startTime: Number(entry.startTime.toFixed(3)),
              duration: Number(entry.duration.toFixed(3)),
              stage: window.__dvProfiler.currentStage,
            })
          }
        })
        observer.observe({ type: 'longtask', buffered: true })
        window.__dvProfiler.longTaskObserverAttached = true
      } catch (error) {
        window.__dvProfiler.longTaskObserverAttached = false
        window.__dvProfiler.longTaskObserverError = String(error?.message || error)
      }
    } else {
      window.__dvProfiler.longTaskObserverAttached = false
      window.__dvProfiler.longTaskObserverError = 'PerformanceObserver unavailable'
    }
  }
}

const addLoginScript = async (page, admin) => {
  await page.addInitScript((userData, searchLightEnabled, perfKey, searchLightKey) => {
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem(perfKey, '1')
    if (searchLightEnabled) {
      localStorage.setItem(searchLightKey, '1')
    }
    localStorage.setItem('vuex', JSON.stringify({
      isCollapse: false,
      user: userData,
    }))
  }, admin, SEARCH_LIGHT_RENDER_ENABLED, DATAVIEW_PERF_STORAGE_KEY, SEARCH_LIGHT_RENDER_STORAGE_KEY)
}

const summarizePerfRecords = (records) => {
  const groups = new Map()

  records.forEach((record) => {
    const key = `${record.scope || 'unknown'}::${record.name || 'unknown'}`
    const group = groups.get(key) || {
      scope: record.scope || 'unknown',
      name: record.name || 'unknown',
      count: 0,
      totalDurationMs: 0,
      maxDurationMs: 0,
      failedCount: 0,
      stages: new Set(),
    }

    group.count += 1
    group.totalDurationMs += Number(record.durationMs || 0)
    group.maxDurationMs = Math.max(group.maxDurationMs, Number(record.durationMs || 0))
    if (record.failed) {
      group.failedCount += 1
    }
    if (record.stage) {
      group.stages.add(record.stage)
    }

    groups.set(key, group)
  })

  return [...groups.values()]
    .map((group) => ({
      ...group,
      totalDurationMs: Number(group.totalDurationMs.toFixed(3)),
      maxDurationMs: Number(group.maxDurationMs.toFixed(3)),
      avgDurationMs: Number((group.totalDurationMs / Math.max(group.count, 1)).toFixed(3)),
      stages: [...group.stages].sort(),
    }))
    .sort((left, right) => right.totalDurationMs - left.totalDurationMs)
}

const summarizePerfByStage = (records) => {
  const groups = new Map()

  records.forEach((record) => {
    const stage = String(record.stage || 'unknown')
    const group = groups.get(stage) || {
      stage,
      count: 0,
      totalDurationMs: 0,
      maxDurationMs: 0,
    }

    group.count += 1
    group.totalDurationMs += Number(record.durationMs || 0)
    group.maxDurationMs = Math.max(group.maxDurationMs, Number(record.durationMs || 0))
    groups.set(stage, group)
  })

  return [...groups.values()]
    .map((group) => ({
      ...group,
      totalDurationMs: Number(group.totalDurationMs.toFixed(3)),
      maxDurationMs: Number(group.maxDurationMs.toFixed(3)),
      avgDurationMs: Number((group.totalDurationMs / Math.max(group.count, 1)).toFixed(3)),
    }))
    .sort((left, right) => right.totalDurationMs - left.totalDurationMs)
}

const collectPerfRecords = async (page) => {
  return page.evaluate(() => {
    const records = Array.isArray(window.__dvPerfRecords) ? window.__dvPerfRecords : []
    return records.map((record) => ({ ...record }))
  })
}

const sumPerfDurationByName = (records, name) => Number(records
  .filter((record) => String(record.name || '') === name)
  .reduce((sum, record) => sum + Number(record.durationMs || 0), 0)
  .toFixed(3))

const collectChartModalState = async (page) => {
  return page.evaluate(() => {
    const title = document.querySelector('[data-testid="batch-view-chart-title"]')
    const errorAlert = document.querySelector('.chart-error-overlay .ant-alert-description')
    const noData = document.querySelector('.chart-no-data-overlay')
    const loading = document.querySelector('.chart-loading-overlay')

    return {
      title: String(title?.textContent || '').trim(),
      loadingVisible: Boolean(loading),
      noDataVisible: Boolean(noData),
      errorText: String(errorAlert?.textContent || '').trim(),
    }
  })
}

const hoverBatchReport = async (page, batchTrigger) => {
  const readDiagnostics = async () => page.evaluate(() => {
    const isVisible = (element) => {
      if (!element) {
        return false
      }

      const style = window.getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && rect.width > 0
        && rect.height > 0
    }

    const searchInput = document.querySelector('[data-testid="batch-search-input"]')
    const overlay = Array.from(document.querySelectorAll('.report-popover-overlay, .ant-popover')).find(isVisible)
    const title = Array.from(document.querySelectorAll('.report-popover-title')).find(isVisible)
    const content = Array.from(document.querySelectorAll('.report-popover-content')).find(isVisible)
    const searchLightEnabled = localStorage.getItem('dataview.perf.searchLight') === '1'
    const searchReportPopoverEnabled = localStorage.getItem('dataview.perf.searchReportPopover') === '1'
    const isSearching = Boolean(String(searchInput?.value || '').trim())

    return {
      isSearching,
      searchLightEnabled,
      searchReportPopoverEnabled,
      overlayVisible: Boolean(overlay),
      titleVisible: Boolean(title),
      contentVisible: Boolean(content),
    }
  })

  await batchTrigger.waitFor({ state: 'visible', timeout: 30000 })
  await batchTrigger.hover()

  const beforeWait = await readDiagnostics()
  const visible = await page.locator('.report-popover-content').first()
    .waitFor({ state: 'visible', timeout: HOVER_POPOVER_WAIT_MS })
    .then(() => true)
    .catch(() => false)

  const afterWait = visible ? {
    ...beforeWait,
    contentVisible: true,
  } : await readDiagnostics()

  let reason = 'visible'
  let detail = '报告悬浮卡已显示'

  if (!visible) {
    if (afterWait.isSearching && (afterWait.searchLightEnabled || !afterWait.searchReportPopoverEnabled)) {
      reason = 'search-disabled'
      detail = afterWait.searchLightEnabled
        ? '搜索轻量模式已关闭报告悬浮卡'
        : '搜索态未开启报告悬浮卡'
    } else if (afterWait.overlayVisible || afterWait.titleVisible) {
      reason = 'content-not-rendered'
      detail = '悬浮层已出现，但报告内容未渲染'
    } else {
      reason = 'timeout'
      detail = '等待时间内未出现报告悬浮卡'
    }
  }

  return {
    visible,
    reason,
    detail,
    waitMs: HOVER_POPOVER_WAIT_MS,
    mode: SEARCH_LIGHT_RENDER_ENABLED ? 'search-light' : 'default',
    context: {
      isSearching: afterWait.isSearching,
      searchLightEnabled: afterWait.searchLightEnabled,
      searchReportPopoverEnabled: afterWait.searchReportPopoverEnabled,
      overlayVisible: afterWait.overlayVisible,
      titleVisible: afterWait.titleVisible,
      contentVisible: afterWait.contentVisible,
    },
  }
}

const dispatchDomClick = async (page, selector) => {
  return page.evaluate((targetSelector) => {
    const target = document.querySelector(targetSelector)
    if (!target) {
      return false
    }

    target.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
    }))
    return true
  }, selector)
}

const snapshotStage = async (page, stageLabel, fn) => {
  await page.evaluate((stage) => {
    window.__dvProfiler?.setStage?.(stage)
  }, `${stageLabel}:start`)

  const start = performance.now()
  await fn()
  const durationMs = Number((performance.now() - start).toFixed(3))
  await wait(WAIT_AFTER_INTERACTION_MS)

  await page.evaluate((stage) => {
    window.__dvProfiler?.setStage?.(stage)
  }, `${stageLabel}:settled`)

  const profilerState = await page.evaluate(() => window.__dvProfiler?.flush?.() || { longTasks: [], marks: [] })
  const stageLongTasks = (profilerState.longTasks || []).filter((item) => String(item.stage || '').startsWith(stageLabel))
  const totalLongTaskDuration = Number(stageLongTasks.reduce((sum, item) => sum + Number(item.duration || 0), 0).toFixed(3))
  const worstLongTask = stageLongTasks.reduce((max, item) => {
    return Number(item.duration || 0) > Number(max?.duration || 0) ? item : max
  }, null)

  return {
    stage: stageLabel,
    durationMs,
    longTaskCount: stageLongTasks.length,
    totalLongTaskDuration,
    worstLongTask,
  }
}

const snapshotSearchBreakdown = async (page, prefix) => {
  const perfCountBefore = await page.evaluate(() => Array.isArray(window.__dvPerfRecords) ? window.__dvPerfRecords.length : 0)
  const profilerBefore = await page.evaluate(() => window.__dvProfiler?.flush?.() || { longTasks: [] })
  const longTaskCountBefore = Array.isArray(profilerBefore.longTasks) ? profilerBefore.longTasks.length : 0

  await page.evaluate((stage) => {
    window.__dvProfiler?.setStage?.(stage)
  }, 'search-prefix:input')

  const totalStart = performance.now()
  await page.fill('[data-testid="batch-search-input"]', prefix)
  await page.waitForTimeout(SEARCH_INPUT_DEBOUNCE_MS)

  await page.evaluate((stage) => {
    window.__dvProfiler?.setStage?.(stage)
  }, 'search-prefix:compute')

  const computeStart = performance.now()
  await page.locator('tbody tr.row-product').filter({ hasText: prefix }).first().waitFor({ state: 'visible', timeout: 30000 })
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const computeDurationMs = Number((performance.now() - computeStart).toFixed(3))
  const totalDurationMs = Number((performance.now() - totalStart).toFixed(3))

  await page.evaluate((stage) => {
    window.__dvProfiler?.setStage?.(stage)
  }, 'search-prefix:settled')

  const perfRecords = await collectPerfRecords(page)
  const stageRecords = perfRecords
    .slice(perfCountBefore)
    .filter((record) => String(record.stage || '').startsWith('search-prefix:'))

  const profilerAfter = await page.evaluate(() => window.__dvProfiler?.flush?.() || { longTasks: [] })
  const stageLongTasks = (profilerAfter.longTasks || [])
    .slice(longTaskCountBefore)
    .filter((item) => String(item.stage || '').startsWith('search-prefix:'))

  const filteredTreeDataMs = sumPerfDurationByName(stageRecords, 'filteredTreeData')
  const flatRowStateMs = sumPerfDurationByName(stageRecords, 'flatRowState')
  const autoExpandDecisionMs = sumPerfDurationByName(stageRecords, 'searchAutoExpandedRowKeys')
  const domCommitMs = sumPerfDurationByName(stageRecords, 'searchDomCommit')
  const firstScreenRenderMs = Number(Math.max(0, totalDurationMs - SEARCH_INPUT_DEBOUNCE_MS - filteredTreeDataMs - flatRowStateMs).toFixed(3))
  const totalLongTaskDurationMs = Number(stageLongTasks.reduce((sum, item) => sum + Number(item.duration || 0), 0).toFixed(3))

  return {
    stage: 'search-prefix',
    debounceMs: SEARCH_INPUT_DEBOUNCE_MS,
    totalDurationMs,
    computeDurationMs,
    filteredTreeDataMs,
    flatRowStateMs,
    autoExpandDecisionMs,
    domCommitMs,
    firstScreenRenderMs,
    perfRecordCount: stageRecords.length,
    longTaskCount: stageLongTasks.length,
    totalLongTaskDurationMs,
  }
}

const firstVisibleLocator = async (locators) => {
  for (const item of locators) {
    if (await item.count()) {
      return item.first()
    }
  }
  return null
}

const clickToggleByRowText = async (page, rowClass, text) => {
  return page.evaluate(({ rowClassName, textMatch }) => {
    const rows = Array.from(document.querySelectorAll(`tbody tr.${rowClassName}`))
    const targetRow = rows.find((row) => String(row.textContent || '').includes(textMatch))
    const toggleButton = targetRow?.querySelector('.tree-toggle-button')
    if (!targetRow || !toggleButton) {
      return false
    }
    toggleButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    return true
  }, { rowClassName: rowClass, textMatch: text })
}

const expandVisibleRows = async (page, rowSelector, limit, stagePrefix, result, key) => {
  const rows = page.locator(rowSelector).filter({ has: page.locator('.tree-toggle-button') })
  const count = Math.min(await rows.count(), limit)

  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index)
    result.stages.push(await snapshotStage(page, `${stagePrefix}-${index + 1}`, async () => {
      await row.waitFor({ state: 'visible', timeout: 30000 })
      await row.locator('.tree-toggle-button').click()
    }))
    result.selectedNodes[`${key}${index + 1}`] = (await row.textContent())?.trim() || ''

    if (await page.locator('.batch-name-trigger').count()) {
      return true
    }
  }

  return false
}

const main = async () => {
  const admin = await ensureAdmin()
  const metadata = (await readMetadata()) || await createTargetedFixture(admin)
  const useSearchScopedPath = Boolean(metadata?.prefix)
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  if (metadata?.cleanupState) {
    await wait(800)
  }

  await page.addInitScript(buildWindowInitScript())
  await addLoginScript(page, admin)

  const result = {
    prefix: metadata?.prefix || '',
    scale: metadata?.scale || null,
    datasetMode: metadata?.cleanupState ? 'targeted-fixture' : 'seeded',
    renderMode: SEARCH_LIGHT_RENDER_ENABLED ? 'search-light' : 'default',
    searchBreakdown: null,
    chartState: null,
    perf: {
      enabled: true,
      storageKey: DATAVIEW_PERF_STORAGE_KEY,
      recordCount: 0,
      records: [],
      topRecords: [],
      summaryByOp: [],
      summaryByStage: [],
    },
    observer: {},
    hoverReport: null,
    stages: [],
    rowsVisible: 0,
    selectedNodes: {},
    allLongTasks: [],
    topLongTasks: [],
  }

  try {
    result.stages.push(await snapshotStage(page, 'goto-data-view', async () => {
      await page.goto(`${WEB_BASE}/#/data_view`, { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle')
      await page.waitForSelector('[data-testid="batch-search-input"]', { timeout: 30000 })
      await page.locator('vite-error-overlay').waitFor({ state: 'detached', timeout: 30000 }).catch(() => {})
    }))

    if (metadata?.prefix) {
      result.searchBreakdown = await snapshotSearchBreakdown(page, metadata.prefix)
      result.stages.push({
        stage: 'search-prefix',
        durationMs: result.searchBreakdown.computeDurationMs,
        longTaskCount: 0,
        totalLongTaskDuration: 0,
        worstLongTask: null,
      })

      if (!useSearchScopedPath) {
        result.stages.push(await snapshotStage(page, 'clear-search', async () => {
          await page.fill('[data-testid="batch-search-input"]', '')
          await page.waitForTimeout(250)
        }))
      }
    }

    const productRow = metadata?.prefix
      ? page.locator('tbody tr.row-product')
        .filter({ hasText: metadata.prefix })
        .first()
      : page.locator('tbody tr.row-product')
        .first()

    if (!useSearchScopedPath) {
      result.stages.push(await snapshotStage(page, 'expand-product', async () => {
        if (metadata?.productName) {
          const clicked = await clickToggleByRowText(page, 'row-product', metadata.productName)
          if (!clicked) {
            throw new Error(`未找到目标产品行: ${metadata.productName}`)
          }
          return
        }
        await productRow.locator('.tree-toggle-button').first().click()
      }))
      result.selectedNodes.product = (await productRow.textContent())?.trim() || ''
    } else {
      await productRow.waitFor({ state: 'visible', timeout: 30000 })
      result.selectedNodes.product = (await productRow.textContent())?.trim() || ''

      if (!(await page.locator('.batch-name-trigger').count()) && await productRow.locator('.tree-toggle-button').count()) {
        result.stages.push(await snapshotStage(page, 'expand-product-search-scoped', async () => {
          await productRow.locator('.tree-toggle-button').first().click()
        }))
      }
    }

    if (useSearchScopedPath && !(await page.locator('.batch-name-trigger').count())) {
      const strainRow = await firstVisibleLocator([
        page.locator('tbody tr.row-strain').filter({ has: page.locator('.tree-toggle-button') }),
      ])
      if (strainRow) {
        result.stages.push(await snapshotStage(page, 'expand-strain-search-scoped', async () => {
          await strainRow.waitFor({ state: 'visible', timeout: 30000 })
          await strainRow.locator('.tree-toggle-button').click()
        }))
        result.selectedNodes.strain = (await strainRow.textContent())?.trim() || ''
      }
    }

    if (useSearchScopedPath && !(await page.locator('.batch-name-trigger').count())) {
      const designRow = await firstVisibleLocator([
        page.locator('tbody tr.row-experiment').filter({ has: page.locator('.tree-toggle-button') }),
        page.locator('tbody tr.row-experiment'),
      ])
      if (designRow && await designRow.locator('.tree-toggle-button').count()) {
        result.stages.push(await snapshotStage(page, 'expand-experiment-search-scoped', async () => {
          await designRow.waitFor({ state: 'visible', timeout: 30000 })
          await designRow.locator('.tree-toggle-button').click()
        }))
      }
      if (designRow) {
        result.selectedNodes.experiment = (await designRow.textContent())?.trim() || ''
      }
    }

    if (!useSearchScopedPath && !(await page.locator('.batch-name-trigger').count())) {
      if (metadata?.strainName) {
        result.stages.push(await snapshotStage(page, 'expand-strain-targeted', async () => {
          const clicked = await clickToggleByRowText(page, 'row-strain', metadata.strainName)
          if (!clicked) {
            throw new Error(`未找到目标菌株行: ${metadata.strainName}`)
          }
        }))
        result.selectedNodes.strain = metadata.strainName
      } else {
        await expandVisibleRows(page, 'tbody tr.row-strain', 5, 'expand-strain', result, 'strain')
      }
    }

    if (!useSearchScopedPath && !(await page.locator('.batch-name-trigger').count())) {
      if (metadata?.designName) {
        result.stages.push(await snapshotStage(page, 'expand-experiment-targeted', async () => {
          const clicked = await clickToggleByRowText(page, 'row-experiment', metadata.designName)
          if (!clicked) {
            throw new Error(`未找到目标实验行: ${metadata.designName}`)
          }
        }))
        result.selectedNodes.experiment = metadata.designName
      } else {
        await expandVisibleRows(page, 'tbody tr.row-experiment', 8, 'expand-experiment', result, 'experiment')
      }
    }

    if (!useSearchScopedPath) {
      const strainRow = await firstVisibleLocator([
        page.locator('tbody tr.row-strain').filter({ has: page.locator('.tree-toggle-button') }),
      ])
      if (strainRow && !result.selectedNodes.strain1) {
        result.stages.push(await snapshotStage(page, 'expand-strain', async () => {
          await strainRow.waitFor({ state: 'visible', timeout: 30000 })
          await strainRow.locator('.tree-toggle-button').click()
        }))
        result.selectedNodes.strain = (await strainRow.textContent())?.trim() || ''
      }

      const designRow = await firstVisibleLocator([
        page.locator('tbody tr.row-experiment').filter({ has: page.locator('.tree-toggle-button') }),
        page.locator('tbody tr.row-experiment'),
      ])
      if (designRow && await designRow.locator('.tree-toggle-button').count() && !result.selectedNodes.experiment1) {
        result.stages.push(await snapshotStage(page, 'expand-experiment', async () => {
          await designRow.waitFor({ state: 'visible', timeout: 30000 })
          await designRow.locator('.tree-toggle-button').click()
        }))
      }
      if (designRow) {
        result.selectedNodes.experiment = (await designRow.textContent())?.trim() || ''
      }
    }

    const batchTriggerCount = await page.locator('.batch-name-trigger').count()
    if (!batchTriggerCount) {
      result.selectedNodes.batch = ''
      result.selectedNodes.batchMissingReason = '未在当前真实数据的已展开链路中发现可见批次按钮'
    } else {
      const batchTrigger = page.locator('.batch-name-trigger').first()
      result.stages.push(await snapshotStage(page, 'hover-batch-report', async () => {
        result.hoverReport = await hoverBatchReport(page, batchTrigger)
      }))
      result.selectedNodes.batch = (await batchTrigger.textContent())?.trim() || ''

      result.stages.push(await snapshotStage(page, 'open-batch-chart', async () => {
        const testId = await batchTrigger.getAttribute('data-testid')
        const selector = testId ? `[data-testid="${testId}"]` : '.batch-name-trigger'
        const clicked = await dispatchDomClick(page, selector)
        if (!clicked) {
          throw new Error(`未找到可点击的批次按钮: ${selector}`)
        }
        await page.locator('[data-testid="batch-view-chart-title"]').first().waitFor({ state: 'visible', timeout: 30000 })
      }))
      await page.waitForTimeout(300)
      result.chartState = await collectChartModalState(page)
    }

    result.rowsVisible = await page.locator('tbody tr').count()

    const finalProfiler = await page.evaluate(() => window.__dvProfiler?.flush?.() || { longTasks: [], marks: [] })
    const perfRecords = await collectPerfRecords(page)
    result.perf.recordCount = perfRecords.length
    result.perf.records = perfRecords
    result.perf.topRecords = [...perfRecords]
      .sort((left, right) => Number(right.durationMs || 0) - Number(left.durationMs || 0))
      .slice(0, 30)
    result.perf.summaryByOp = summarizePerfRecords(perfRecords).slice(0, 30)
    result.perf.summaryByStage = summarizePerfByStage(perfRecords)

    result.allLongTasks = finalProfiler.longTasks || []
    result.topLongTasks = [...result.allLongTasks]
      .sort((left, right) => Number(right.duration || 0) - Number(left.duration || 0))
      .slice(0, 20)

    result.observer = {
      attached: await page.evaluate(() => Boolean(window.__dvProfiler?.longTaskObserverAttached)),
      error: await page.evaluate(() => window.__dvProfiler?.longTaskObserverError || ''),
    }

    const readableResult = buildReadableResult(result, metadata)
    await fs.writeFile(outputPath, `${JSON.stringify(readableResult, null, 2)}\n`, 'utf8')
    console.log(JSON.stringify(readableResult, null, 2))
  } finally {
    await page.close()
    await browser.close()
    if (metadata?.cleanupState) {
      await cleanupTargetedFixture(metadata)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})