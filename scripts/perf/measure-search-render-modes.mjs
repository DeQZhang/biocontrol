import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require(require.resolve('playwright', { paths: [path.resolve('frontend')] }))

const WEB_BASE = process.env.WEB_BASE || 'http://127.0.0.1:5173'
const metadataPath = path.resolve('scripts/perf/.dataview-seed.json')
const outputPath = path.resolve('scripts/perf/.dataview-search-render-modes.json')
const SEARCH_INPUT_DEBOUNCE_MS = Number(process.env.PERF_SEARCH_DEBOUNCE_MS || 90)
const REPEAT_COUNT = Math.max(1, Number(process.env.PERF_REPEAT_COUNT || 1))
const PERF_EVENT_TIMEOUT_MS = Number(process.env.PERF_EVENT_TIMEOUT_MS || 30000)
const DATAVIEW_PERF_STORAGE_KEY = 'dataview.perf.enabled'
const SEARCH_LIGHT_RENDER_STORAGE_KEY = 'dataview.perf.searchLight'
const SEARCH_DEBOUNCE_STORAGE_KEY = 'dataview.perf.searchDebounceMs'
const SEARCH_RICH_NAME_STORAGE_KEY = 'dataview.perf.searchRichName'
const SEARCH_REPORT_POPOVER_STORAGE_KEY = 'dataview.perf.searchReportPopover'
const SEARCH_FULL_ACTIONS_STORAGE_KEY = 'dataview.perf.searchFullActions'
const SEARCH_DOE_BATCH_ACTIONS_STORAGE_KEY = 'dataview.perf.searchDoeBatchActions'
const SEARCH_STANDARD_BATCH_ACTIONS_STORAGE_KEY = 'dataview.perf.searchStandardBatchActions'
const SEARCH_SUMMARY_ACTIONS_STORAGE_KEY = 'dataview.perf.searchSummaryActions'
const SEARCH_STANDARD_BATCH_EDIT_STORAGE_KEY = 'dataview.perf.searchStandardBatchEdit'
const SEARCH_STANDARD_BATCH_UPLOAD_STORAGE_KEY = 'dataview.perf.searchStandardBatchUpload'
const SEARCH_STANDARD_BATCH_SUMMARY_STORAGE_KEY = 'dataview.perf.searchStandardBatchSummary'
const SEARCH_STANDARD_BATCH_COMPARE_STORAGE_KEY = 'dataview.perf.searchStandardBatchCompare'
const SEARCH_STANDARD_BATCH_DELETE_STORAGE_KEY = 'dataview.perf.searchStandardBatchDelete'
const SEARCH_SUMMARY_PRODUCT_STORAGE_KEY = 'dataview.perf.searchSummaryProduct'
const SEARCH_SUMMARY_STRAIN_STORAGE_KEY = 'dataview.perf.searchSummaryStrain'
const SEARCH_SUMMARY_EXPERIMENT_STORAGE_KEY = 'dataview.perf.searchSummaryExperiment'
const SEARCH_STANDARD_BATCH_ACTION_TOOLTIP_STORAGE_KEY = 'dataview.perf.searchStandardBatchActionTooltip'
const SEARCH_STANDARD_BATCH_ACTION_ICON_STORAGE_KEY = 'dataview.perf.searchStandardBatchActionIcon'
const SEARCH_STANDARD_BATCH_DELETE_POPCONFIRM_STORAGE_KEY = 'dataview.perf.searchStandardBatchDeletePopconfirm'
const SCENARIO_ID_FILTER = new Set(String(process.env.PERF_SCENARIO_IDS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean))

const buildToggleEntries = (scenario) => ({
  [SEARCH_RICH_NAME_STORAGE_KEY]: scenario.richName,
  [SEARCH_REPORT_POPOVER_STORAGE_KEY]: scenario.reportPopover,
  [SEARCH_FULL_ACTIONS_STORAGE_KEY]: scenario.fullActions,
  [SEARCH_DOE_BATCH_ACTIONS_STORAGE_KEY]: scenario.doeBatchActions,
  [SEARCH_STANDARD_BATCH_ACTIONS_STORAGE_KEY]: scenario.standardBatchActions,
  [SEARCH_SUMMARY_ACTIONS_STORAGE_KEY]: scenario.summaryActions,
  [SEARCH_STANDARD_BATCH_EDIT_STORAGE_KEY]: scenario.standardBatchEdit,
  [SEARCH_STANDARD_BATCH_UPLOAD_STORAGE_KEY]: scenario.standardBatchUpload,
  [SEARCH_STANDARD_BATCH_SUMMARY_STORAGE_KEY]: scenario.standardBatchSummary,
  [SEARCH_STANDARD_BATCH_COMPARE_STORAGE_KEY]: scenario.standardBatchCompare,
  [SEARCH_STANDARD_BATCH_DELETE_STORAGE_KEY]: scenario.standardBatchDelete,
  [SEARCH_SUMMARY_PRODUCT_STORAGE_KEY]: scenario.summaryProduct,
  [SEARCH_SUMMARY_STRAIN_STORAGE_KEY]: scenario.summaryStrain,
  [SEARCH_SUMMARY_EXPERIMENT_STORAGE_KEY]: scenario.summaryExperiment,
  [SEARCH_STANDARD_BATCH_ACTION_TOOLTIP_STORAGE_KEY]: scenario.standardBatchActionTooltip,
  [SEARCH_STANDARD_BATCH_ACTION_ICON_STORAGE_KEY]: scenario.standardBatchActionIcon,
  [SEARCH_STANDARD_BATCH_DELETE_POPCONFIRM_STORAGE_KEY]: scenario.standardBatchDeletePopconfirm,
})

const SCENARIOS = [
  {
    id: 'official-search-compact',
    label: '正式搜索降级',
    richName: false,
    reportPopover: false,
    fullActions: false,
    doeBatchActions: false,
    standardBatchActions: false,
    summaryActions: false,
    standardBatchEdit: false,
    standardBatchUpload: false,
    standardBatchSummary: false,
    standardBatchCompare: false,
    standardBatchDelete: false,
    summaryProduct: false,
    summaryStrain: false,
    summaryExperiment: false,
    standardBatchActionTooltip: false,
    standardBatchActionIcon: false,
    standardBatchDeletePopconfirm: false,
  },
  {
    id: 'legacy-all-heavy',
    label: '旧版全重型',
    richName: true,
    reportPopover: true,
    fullActions: true,
    doeBatchActions: true,
    standardBatchActions: true,
    summaryActions: true,
    standardBatchEdit: true,
    standardBatchUpload: true,
    standardBatchSummary: true,
    standardBatchCompare: true,
    standardBatchDelete: true,
    summaryProduct: true,
    summaryStrain: true,
    summaryExperiment: true,
    standardBatchActionTooltip: true,
    standardBatchActionIcon: true,
    standardBatchDeletePopconfirm: true,
  },
  {
    id: 'no-name-decor',
    label: '关闭名称重装饰',
    richName: false,
    reportPopover: true,
    fullActions: true,
    doeBatchActions: true,
    standardBatchActions: true,
    summaryActions: true,
    standardBatchEdit: true,
    standardBatchUpload: true,
    standardBatchSummary: true,
    standardBatchCompare: true,
    standardBatchDelete: true,
    summaryProduct: true,
    summaryStrain: true,
    summaryExperiment: true,
    standardBatchActionTooltip: true,
    standardBatchActionIcon: true,
    standardBatchDeletePopconfirm: true,
  },
  {
    id: 'no-report-popover',
    label: '关闭报告触发器',
    richName: true,
    reportPopover: false,
    fullActions: true,
    doeBatchActions: true,
    standardBatchActions: true,
    summaryActions: true,
    standardBatchEdit: true,
    standardBatchUpload: true,
    standardBatchSummary: true,
    standardBatchCompare: true,
    standardBatchDelete: true,
    summaryProduct: true,
    summaryStrain: true,
    summaryExperiment: true,
    standardBatchActionTooltip: true,
    standardBatchActionIcon: true,
    standardBatchDeletePopconfirm: true,
  },
  {
    id: 'no-doe-batch-actions',
    label: '关闭 DOE 批次操作',
    richName: true,
    reportPopover: true,
    fullActions: false,
    doeBatchActions: false,
    standardBatchActions: true,
    summaryActions: true,
    standardBatchEdit: true,
    standardBatchUpload: true,
    standardBatchSummary: true,
    standardBatchCompare: true,
    standardBatchDelete: true,
    summaryProduct: true,
    summaryStrain: true,
    summaryExperiment: true,
    standardBatchActionTooltip: true,
    standardBatchActionIcon: true,
    standardBatchDeletePopconfirm: true,
  },
  {
    id: 'no-standard-batch-edit',
    label: '关闭普通批次编辑',
    richName: true,
    reportPopover: true,
    fullActions: false,
    doeBatchActions: true,
    standardBatchActions: true,
    summaryActions: true,
    standardBatchEdit: false,
    standardBatchUpload: true,
    standardBatchSummary: true,
    standardBatchCompare: true,
    standardBatchDelete: true,
    summaryProduct: true,
    summaryStrain: false,
    summaryExperiment: true,
    standardBatchActionTooltip: true,
    standardBatchActionIcon: true,
    standardBatchDeletePopconfirm: true,
  },
  {
    id: 'no-standard-batch-upload',
    label: '关闭普通批次上传',
    richName: true,
    reportPopover: true,
    fullActions: false,
    doeBatchActions: true,
    standardBatchActions: true,
    summaryActions: true,
    standardBatchEdit: true,
    standardBatchUpload: false,
    standardBatchSummary: true,
    standardBatchCompare: true,
    standardBatchDelete: true,
    summaryProduct: true,
    summaryStrain: false,
    summaryExperiment: true,
    standardBatchActionTooltip: true,
    standardBatchActionIcon: true,
    standardBatchDeletePopconfirm: true,
  },
  {
    id: 'no-standard-batch-summary',
    label: '关闭普通批次总结',
    richName: true,
    reportPopover: true,
    fullActions: false,
    doeBatchActions: true,
    standardBatchActions: true,
    summaryActions: true,
    standardBatchEdit: true,
    standardBatchUpload: true,
    standardBatchSummary: false,
    standardBatchCompare: true,
    standardBatchDelete: true,
    summaryProduct: true,
    summaryStrain: false,
    summaryExperiment: true,
    standardBatchActionTooltip: true,
    standardBatchActionIcon: true,
    standardBatchDeletePopconfirm: true,
  },
  {
    id: 'no-standard-batch-compare',
    label: '关闭普通批次对比',
    richName: true,
    reportPopover: true,
    fullActions: false,
    doeBatchActions: true,
    standardBatchActions: true,
    summaryActions: true,
    standardBatchEdit: true,
    standardBatchUpload: true,
    standardBatchSummary: true,
    standardBatchCompare: false,
    standardBatchDelete: true,
    summaryProduct: true,
    summaryStrain: false,
    summaryExperiment: true,
    standardBatchActionTooltip: true,
    standardBatchActionIcon: true,
    standardBatchDeletePopconfirm: true,
  },
  {
    id: 'no-standard-batch-delete',
    label: '关闭普通批次删除',
    richName: true,
    reportPopover: true,
    fullActions: false,
    doeBatchActions: true,
    standardBatchActions: true,
    summaryActions: true,
    standardBatchEdit: true,
    standardBatchUpload: true,
    standardBatchSummary: true,
    standardBatchCompare: true,
    standardBatchDelete: false,
    summaryProduct: true,
    summaryStrain: false,
    summaryExperiment: true,
    standardBatchActionTooltip: true,
    standardBatchActionIcon: true,
    standardBatchDeletePopconfirm: true,
  },
  {
    id: 'no-summary-product',
    label: '关闭产品汇总操作',
    richName: true,
    reportPopover: true,
    fullActions: false,
    doeBatchActions: true,
    standardBatchActions: true,
    summaryActions: true,
    standardBatchEdit: true,
    standardBatchUpload: true,
    standardBatchSummary: true,
    standardBatchCompare: true,
    standardBatchDelete: true,
    summaryProduct: false,
    summaryStrain: false,
    summaryExperiment: true,
    standardBatchActionTooltip: true,
    standardBatchActionIcon: true,
    standardBatchDeletePopconfirm: true,
  },
  {
    id: 'no-summary-strain',
    label: '关闭菌株汇总操作',
    richName: true,
    reportPopover: true,
    fullActions: false,
    doeBatchActions: true,
    standardBatchActions: true,
    summaryActions: true,
    standardBatchEdit: true,
    standardBatchUpload: true,
    standardBatchSummary: true,
    standardBatchCompare: true,
    standardBatchDelete: true,
    summaryProduct: true,
    summaryStrain: false,
    summaryExperiment: true,
    standardBatchActionTooltip: true,
    standardBatchActionIcon: true,
    standardBatchDeletePopconfirm: true,
  },
  {
    id: 'no-summary-experiment',
    label: '关闭实验汇总操作',
    richName: true,
    reportPopover: true,
    fullActions: false,
    doeBatchActions: true,
    standardBatchActions: true,
    summaryActions: true,
    standardBatchEdit: true,
    standardBatchUpload: true,
    standardBatchSummary: true,
    standardBatchCompare: true,
    standardBatchDelete: true,
    summaryProduct: true,
    summaryStrain: false,
    summaryExperiment: false,
    standardBatchActionTooltip: true,
    standardBatchActionIcon: true,
    standardBatchDeletePopconfirm: true,
  },
  {
    id: 'no-standard-batch-action-tooltips',
    label: '关闭普通批次按钮 tooltip',
    richName: true,
    reportPopover: true,
    fullActions: false,
    doeBatchActions: true,
    standardBatchActions: true,
    summaryActions: true,
    standardBatchEdit: true,
    standardBatchUpload: true,
    standardBatchSummary: true,
    standardBatchCompare: true,
    standardBatchDelete: true,
    summaryProduct: true,
    summaryStrain: false,
    summaryExperiment: true,
    standardBatchActionTooltip: false,
    standardBatchActionIcon: true,
    standardBatchDeletePopconfirm: true,
  },
  {
    id: 'no-standard-batch-action-icons',
    label: '关闭普通批次 IconActionButton',
    richName: true,
    reportPopover: true,
    fullActions: false,
    doeBatchActions: true,
    standardBatchActions: true,
    summaryActions: true,
    standardBatchEdit: true,
    standardBatchUpload: true,
    standardBatchSummary: true,
    standardBatchCompare: true,
    standardBatchDelete: true,
    summaryProduct: true,
    summaryStrain: false,
    summaryExperiment: true,
    standardBatchActionTooltip: true,
    standardBatchActionIcon: false,
    standardBatchDeletePopconfirm: true,
  },
  {
    id: 'no-standard-batch-delete-popconfirm',
    label: '关闭普通批次删除确认',
    richName: true,
    reportPopover: true,
    fullActions: false,
    doeBatchActions: true,
    standardBatchActions: true,
    summaryActions: true,
    standardBatchEdit: true,
    standardBatchUpload: true,
    standardBatchSummary: true,
    standardBatchCompare: true,
    standardBatchDelete: true,
    summaryProduct: true,
    summaryStrain: false,
    summaryExperiment: true,
    standardBatchActionTooltip: true,
    standardBatchActionIcon: true,
    standardBatchDeletePopconfirm: false,
  },
  {
    id: 'no-all-action-groups',
    label: '关闭全部操作组',
    richName: true,
    reportPopover: true,
    fullActions: false,
    doeBatchActions: false,
    standardBatchActions: false,
    summaryActions: false,
    standardBatchEdit: false,
    standardBatchUpload: false,
    standardBatchSummary: false,
    standardBatchCompare: false,
    standardBatchDelete: false,
    summaryProduct: false,
    summaryStrain: false,
    summaryExperiment: false,
    standardBatchActionTooltip: false,
    standardBatchActionIcon: false,
    standardBatchDeletePopconfirm: false,
  },
]

const readMetadata = async () => {
  const raw = await fs.readFile(metadataPath, 'utf8')
  return JSON.parse(raw)
}

const sumByName = (records, name) => Number(records
  .filter((record) => record.name === name)
  .reduce((sum, record) => sum + Number(record.durationMs || 0), 0)
  .toFixed(3))

const getLastRecordByName = (records, name) => {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    if (records[index]?.name === name) {
      return records[index]
    }
  }
  return null
}

const averageNumber = (values) => Number((values.reduce((sum, value) => sum + Number(value || 0), 0) / Math.max(values.length, 1)).toFixed(3))

const buildResidualBreakdown = (item) => {
  const residualMs = Number(item.residualMs || 0)
  const explicitWaitMs = 0
  const estimatedDebounceMs = Number(SEARCH_INPUT_DEBOUNCE_MS || 0)
  const estimatedWaitPaddingMs = 0
  const userVisibleNonDomMs = Number(Math.max(residualMs - estimatedWaitPaddingMs, 0).toFixed(3))
  const unattributedNonDomMs = Number(Math.max(residualMs - estimatedDebounceMs, 0).toFixed(3))

  return {
    explicitWaitMs,
    estimatedDebounceMs,
    estimatedWaitPaddingMs,
    userVisibleNonDomMs,
    unattributedNonDomMs,
  }
}

const summarizeScenarioSamples = (scenario, samples) => {
  const lastSample = samples[samples.length - 1] || null
  const totalDurationMs = averageNumber(samples.map((sample) => sample.totalDurationMs))
  const filteredTreeDataMs = averageNumber(samples.map((sample) => sample.filteredTreeDataMs))
  const autoExpandDecisionMs = averageNumber(samples.map((sample) => sample.autoExpandDecisionMs))
  const flatRowStateMs = averageNumber(samples.map((sample) => sample.flatRowStateMs))
  const domCommitMs = averageNumber(samples.map((sample) => sample.domCommitMs))
  const residualMs = averageNumber(samples.map((sample) => sample.residualMs))
  return {
    ...scenario,
    sampleCount: samples.length,
    totalDurationMs,
    filteredTreeDataMs,
    autoExpandDecisionMs,
    flatRowStateMs,
    domCommitMs,
    residualMs,
    residualBreakdown: buildResidualBreakdown({ residualMs }),
    recordCount: averageNumber(samples.map((sample) => sample.recordCount)),
    domCommitMeta: lastSample?.domCommitMeta || null,
    samples,
  }
}

const buildInitScript = () => ({ userData, toggleEntries, keys }) => {
  localStorage.clear()
  sessionStorage.clear()
  localStorage.setItem(keys.perf, '1')
  localStorage.setItem(keys.light, '0')
  localStorage.setItem(keys.searchDebounce, String(keys.searchDebounceMs))
  Object.entries(toggleEntries).forEach(([storageKey, enabled]) => {
    localStorage.setItem(storageKey, enabled ? '1' : '0')
  })

  localStorage.setItem('vuex', JSON.stringify({
    isCollapse: false,
    user: userData,
  }))

  window.__dvProfiler = { currentStage: 'bootstrap' }
}

const runScenario = async (browser, metadata, scenario) => {
  const page = await browser.newPage()
  const admin = { id: 1, account: 'Admin', name: 'Admin' }
  await page.addInitScript(buildInitScript(), {
    userData: admin,
    toggleEntries: buildToggleEntries(scenario),
    keys: {
      perf: DATAVIEW_PERF_STORAGE_KEY,
      light: SEARCH_LIGHT_RENDER_STORAGE_KEY,
      searchDebounce: SEARCH_DEBOUNCE_STORAGE_KEY,
      searchDebounceMs: SEARCH_INPUT_DEBOUNCE_MS,
      richName: SEARCH_RICH_NAME_STORAGE_KEY,
      reportPopover: SEARCH_REPORT_POPOVER_STORAGE_KEY,
      fullActions: SEARCH_FULL_ACTIONS_STORAGE_KEY,
      doeBatchActions: SEARCH_DOE_BATCH_ACTIONS_STORAGE_KEY,
      standardBatchActions: SEARCH_STANDARD_BATCH_ACTIONS_STORAGE_KEY,
      summaryActions: SEARCH_SUMMARY_ACTIONS_STORAGE_KEY,
      standardBatchEdit: SEARCH_STANDARD_BATCH_EDIT_STORAGE_KEY,
      standardBatchUpload: SEARCH_STANDARD_BATCH_UPLOAD_STORAGE_KEY,
      standardBatchSummary: SEARCH_STANDARD_BATCH_SUMMARY_STORAGE_KEY,
      standardBatchCompare: SEARCH_STANDARD_BATCH_COMPARE_STORAGE_KEY,
      standardBatchDelete: SEARCH_STANDARD_BATCH_DELETE_STORAGE_KEY,
      summaryProduct: SEARCH_SUMMARY_PRODUCT_STORAGE_KEY,
      summaryStrain: SEARCH_SUMMARY_STRAIN_STORAGE_KEY,
      summaryExperiment: SEARCH_SUMMARY_EXPERIMENT_STORAGE_KEY,
      standardBatchActionTooltip: SEARCH_STANDARD_BATCH_ACTION_TOOLTIP_STORAGE_KEY,
      standardBatchActionIcon: SEARCH_STANDARD_BATCH_ACTION_ICON_STORAGE_KEY,
      standardBatchDeletePopconfirm: SEARCH_STANDARD_BATCH_DELETE_POPCONFIRM_STORAGE_KEY,
    },
  })

  await page.goto(`${WEB_BASE}/#/data_view`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('[data-testid="batch-search-input"]', { timeout: 30000 })

  const beforeCount = await page.evaluate(() => Array.isArray(window.__dvPerfRecords) ? window.__dvPerfRecords.length : 0)
  await page.evaluate(() => {
    window.__dvProfiler.currentStage = 'search-prefix:input'
  })

  const totalStart = performance.now()
  await page.fill('[data-testid="batch-search-input"]', metadata.prefix)
  await page.waitForFunction(({ count, prefix }) => {
    const records = Array.isArray(window.__dvPerfRecords) ? window.__dvPerfRecords.slice(count) : []
    const hasDomCommit = records.some((record) => record?.name === 'searchDomCommit' && record?.stage === 'search-prefix:input')
    if (!hasDomCommit) {
      return false
    }

    const targetRow = Array.from(document.querySelectorAll('tbody tr.row-product'))
      .find((element) => String(element.textContent || '').toLowerCase().includes(String(prefix || '').toLowerCase()))

    if (!targetRow) {
      return false
    }

    const rect = targetRow.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
  }, {
    count: beforeCount,
    prefix: metadata.prefix,
  }, {
    timeout: PERF_EVENT_TIMEOUT_MS,
  })
  const totalDurationMs = Number((performance.now() - totalStart).toFixed(3))

  const records = await page.evaluate((count) => {
    const items = Array.isArray(window.__dvPerfRecords) ? window.__dvPerfRecords.slice(count) : []
    return items.map((item) => ({ ...item }))
  }, beforeCount)

  await page.close()

  const filteredTreeDataMs = sumByName(records, 'filteredTreeData')
  const autoExpandDecisionMs = sumByName(records, 'searchAutoExpandedRowKeys')
  const flatRowStateMs = sumByName(records, 'flatRowState')
  const domCommitMs = sumByName(records, 'searchDomCommit')
  const domCommitRecord = getLastRecordByName(records, 'searchDomCommit')

  return {
    ...scenario,
    totalDurationMs,
    filteredTreeDataMs,
    autoExpandDecisionMs,
    flatRowStateMs,
    domCommitMs,
    residualMs: Number((totalDurationMs - filteredTreeDataMs - autoExpandDecisionMs - flatRowStateMs - domCommitMs).toFixed(3)),
    recordCount: records.length,
    domCommitMeta: domCommitRecord ? {
      compactName: Boolean(domCommitRecord.compactName),
      reportPopover: Boolean(domCommitRecord.reportPopover),
      doeBatchActions: Boolean(domCommitRecord.doeBatchActions),
      standardBatchActions: Boolean(domCommitRecord.standardBatchActions),
      summaryActions: Boolean(domCommitRecord.summaryActions),
      standardBatchEdit: Boolean(domCommitRecord.standardBatchEdit),
      standardBatchUpload: Boolean(domCommitRecord.standardBatchUpload),
      standardBatchSummary: Boolean(domCommitRecord.standardBatchSummary),
      standardBatchCompare: Boolean(domCommitRecord.standardBatchCompare),
      standardBatchDelete: Boolean(domCommitRecord.standardBatchDelete),
      summaryProduct: Boolean(domCommitRecord.summaryProduct),
      summaryStrain: Boolean(domCommitRecord.summaryStrain),
      summaryExperiment: Boolean(domCommitRecord.summaryExperiment),
      standardBatchActionTooltip: Boolean(domCommitRecord.standardBatchActionTooltips),
      standardBatchActionIcon: Boolean(domCommitRecord.standardBatchActionIconButtons),
      standardBatchDeletePopconfirm: Boolean(domCommitRecord.standardBatchDeletePopconfirm),
      rows: Number(domCommitRecord.rows || 0),
    } : null,
    records,
  }
}

const main = async () => {
  const metadata = await readMetadata()
  const browser = await chromium.launch({ headless: true })
  const activeScenarios = SCENARIO_ID_FILTER.size
    ? SCENARIOS.filter((scenario) => SCENARIO_ID_FILTER.has(scenario.id))
    : SCENARIOS

  try {
    const results = []
    for (const scenario of activeScenarios) {
      const samples = []
      for (let index = 0; index < REPEAT_COUNT; index += 1) {
        try {
          samples.push(await runScenario(browser, metadata, scenario))
        } catch (error) {
          console.error(`[measure-search-render-modes] scenario failed: ${scenario.id} sample ${index + 1}/${REPEAT_COUNT}`)
          throw error
        }
      }
      results.push(summarizeScenarioSamples(scenario, samples))
    }

    const heavyBaseline = results.find((item) => item.id === 'legacy-all-heavy') || results[0]
    const deltas = results.map((item) => ({
      id: item.id,
      label: item.label,
      totalDurationMsDeltaVsHeavy: Number((heavyBaseline.totalDurationMs - item.totalDurationMs).toFixed(3)),
      domCommitMsDeltaVsHeavy: Number((heavyBaseline.domCommitMs - item.domCommitMs).toFixed(3)),
      residualMsDeltaVsHeavy: Number((heavyBaseline.residualMs - item.residualMs).toFixed(3)),
    }))

    const output = {
      prefix: metadata.prefix,
      searchDebounceMs: SEARCH_INPUT_DEBOUNCE_MS,
      perfEventTimeoutMs: PERF_EVENT_TIMEOUT_MS,
      repeatCount: REPEAT_COUNT,
      activeScenarioIds: activeScenarios.map((scenario) => scenario.id),
      heavyBaseline: heavyBaseline.id,
      results,
      deltas,
    }

    await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
    console.log(JSON.stringify(output, null, 2))
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})