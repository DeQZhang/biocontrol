import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require(require.resolve('playwright', { paths: [path.resolve('frontend')] }))

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8080/api'
const WEB_BASE = process.env.WEB_BASE || 'http://127.0.0.1:5173'
const SAMPLES = Number(process.env.PERF_SAMPLES || 3)
const SEARCH_SETTLE_WAIT_MS = Number(process.env.PERF_SEARCH_SETTLE_WAIT_MS || 250)
const SEARCH_INPUT_DEBOUNCE_MS = Number(process.env.PERF_SEARCH_INPUT_DEBOUNCE_MS || 180)
const metadataPath = path.resolve('scripts/perf/.dataview-seed.json')

const average = (rows, key) => rows.reduce((sum, item) => sum + item[key], 0) / rows.length
const estimateNetSearchDuration = (durationMs) => Math.max(0, durationMs - SEARCH_SETTLE_WAIT_MS - SEARCH_INPUT_DEBOUNCE_MS)

const waitForVisible = async (locator, timeout = 30000) => {
  if (await locator.count()) {
    await locator.first().waitFor({ state: 'visible', timeout })
    return locator.first()
  }
  return null
}

const ensureAdmin = async () => {
  await fetch(`${API_BASE}/users/admin/init`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
  const response = await fetch(`${API_BASE}/users`)
  const payload = await response.json()
  return (payload.data || []).find((item) => item.account === 'Admin') || (payload.data || [])[0]
}

const main = async () => {
  const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'))
  const admin = await ensureAdmin()
  const browser = await chromium.launch({ headless: true })
  const samples = []

  for (let sampleIndex = 0; sampleIndex < SAMPLES; sampleIndex += 1) {
    const page = await browser.newPage()
    await page.addInitScript((userData) => {
      localStorage.clear()
      sessionStorage.clear()
      localStorage.setItem('vuex', JSON.stringify({ isCollapse: false, user: userData }))
    }, admin)

    const metrics = {}
    let start = performance.now()
    await page.goto(`${WEB_BASE}/#/data_view`, { waitUntil: 'domcontentloaded' })
    metrics.initialDomContentLoaded = performance.now() - start

    start = performance.now()
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('[data-testid="batch-search-input"]', { timeout: 30000 })
    metrics.dataViewReady = performance.now() - start

    start = performance.now()
    await page.fill('[data-testid="batch-search-input"]', metadata.prefix)
    await page.waitForTimeout(SEARCH_SETTLE_WAIT_MS)
    await page.locator('tbody tr').first().waitFor({ state: 'visible', timeout: 30000 })
    metrics.searchByPrefix = performance.now() - start
    metrics.searchByPrefixNet = estimateNetSearchDuration(metrics.searchByPrefix)

    start = performance.now()
    let batchTrigger = await waitForVisible(page.locator('.batch-name-trigger'))
    if (!batchTrigger) {
      const searchScopedProductRow = await waitForVisible(page.locator('tbody tr.row-product').filter({ has: page.locator('.tree-toggle-button') }))
      if (searchScopedProductRow) {
        await searchScopedProductRow.locator('.tree-toggle-button').click()
      }

      const searchScopedStrainRow = await waitForVisible(page.locator('tbody tr.row-strain').filter({ has: page.locator('.tree-toggle-button') }), 10000)
      if (searchScopedStrainRow) {
        await searchScopedStrainRow.locator('.tree-toggle-button').click()
      }

      const searchScopedDesignRow = await waitForVisible(page.locator('tbody tr.row-experiment').filter({ has: page.locator('.tree-toggle-button') }), 10000)
      if (searchScopedDesignRow) {
        await searchScopedDesignRow.locator('.tree-toggle-button').click()
      }

      batchTrigger = await waitForVisible(page.locator('.batch-name-trigger'), 10000)
    }

    if (!batchTrigger) {
      await page.fill('[data-testid="batch-search-input"]', '')
      await page.waitForTimeout(250)

      const preferredProductRow = page.locator('tbody tr.row-product')
        .filter({ hasText: metadata.prefix, hasNotText: '0/0', has: page.locator('.tree-toggle-button') })
      const fallbackProductRow = page.locator('tbody tr.row-product')
        .filter({ hasText: metadata.prefix, has: page.locator('.tree-toggle-button') })
      const productRow = await waitForVisible(preferredProductRow, 10000) || await waitForVisible(fallbackProductRow, 10000)
      if (!productRow) {
        throw new Error(`未找到前缀 ${metadata.prefix} 对应的可展开产品行`)
      }
      await productRow.locator('.tree-toggle-button').click()

      const strainRow = await waitForVisible(page.locator('tbody tr.row-strain').filter({ has: page.locator('.tree-toggle-button') }), 10000)
      if (strainRow) {
        await strainRow.locator('.tree-toggle-button').click()
      }

      const designRow = await waitForVisible(page.locator('tbody tr.row-experiment').filter({ has: page.locator('.tree-toggle-button') }), 10000)
      if (designRow) {
        await designRow.locator('.tree-toggle-button').click()
      }

      batchTrigger = await waitForVisible(page.locator('.batch-name-trigger'), 10000)
      if (!batchTrigger) {
        throw new Error(`未找到前缀 ${metadata.prefix} 对应的批次按钮`)
      }
    }

    metrics.expandToBatch = performance.now() - start

    start = performance.now()
    await batchTrigger.hover()
    await page.locator('.report-popover-content').first().waitFor({ state: 'visible', timeout: 30000 })
    metrics.hoverPopover = performance.now() - start

    const visibleRows = await page.locator('tbody tr').count()
    samples.push({
      initialDomContentLoaded: Number(metrics.initialDomContentLoaded.toFixed(3)),
      dataViewReady: Number(metrics.dataViewReady.toFixed(3)),
      searchByPrefix: Number(metrics.searchByPrefix.toFixed(3)),
      searchByPrefixNet: Number(metrics.searchByPrefixNet.toFixed(3)),
      expandToBatch: Number(metrics.expandToBatch.toFixed(3)),
      hoverPopover: Number(metrics.hoverPopover.toFixed(3)),
      visibleRows,
    })

    await page.close()
  }

  await browser.close()

  console.log(JSON.stringify({
    prefix: metadata.prefix,
    scale: metadata.scale,
    searchMeasurement: {
      settleWaitMs: SEARCH_SETTLE_WAIT_MS,
      debounceMs: SEARCH_INPUT_DEBOUNCE_MS,
      netFormula: 'searchByPrefix - settleWaitMs - debounceMs',
    },
    samples,
    average: {
      initialDomContentLoaded: Number(average(samples, 'initialDomContentLoaded').toFixed(3)),
      dataViewReady: Number(average(samples, 'dataViewReady').toFixed(3)),
      searchByPrefix: Number(average(samples, 'searchByPrefix').toFixed(3)),
      searchByPrefixNet: Number(average(samples, 'searchByPrefixNet').toFixed(3)),
      expandToBatch: Number(average(samples, 'expandToBatch').toFixed(3)),
      hoverPopover: Number(average(samples, 'hoverPopover').toFixed(3)),
      visibleRows: Number(average(samples, 'visibleRows').toFixed(0)),
    },
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})