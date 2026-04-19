import fs from 'node:fs/promises'
import path from 'node:path'

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8080/api'
const metadataPath = path.resolve('scripts/perf/.dataview-seed.json')
const BULK_SIZES = (process.env.PERF_BULK_SIZES || '100,500,1000').split(',').map((item) => Number(item.trim())).filter(Boolean)
const SAMPLES = Number(process.env.PERF_API_SAMPLES || 3)

const request = async (pathname, options = {}) => {
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

const post = (pathname, data) => request(pathname, { method: 'POST', body: JSON.stringify(data) })
const get = (pathname) => request(pathname)
const del = (pathname) => request(pathname, { method: 'DELETE' })

const average = (rows) => rows.reduce((sum, value) => sum + value, 0) / rows.length

const timedGet = async (pathname) => {
  const start = performance.now()
  const payload = await get(pathname)
  const duration = performance.now() - start
  return { duration, payload }
}

const timedPost = async (pathname, data) => {
  const start = performance.now()
  const payload = await post(pathname, data)
  const duration = performance.now() - start
  return { duration, payload }
}

const ensureAdmin = async () => {
  await post('/users/admin/init', {})
  const payload = await get('/users')
  return (payload.data || []).find((item) => item.account === 'Admin') || (payload.data || [])[0]
}

const createBatch = async (meta, admin, size, sampleIndex) => {
  const batchName = `${meta.prefix}-BULK-${size}-${sampleIndex}`
  await post('/batches', {
    batch_name: batchName,
    experiment_design_id: meta.designs[0].id,
    vessel_type: 'fermenter',
    design_detail: `${batchName}-详情`,
    design_date: '2026-04-13',
    experiment_eval: '',
    experiment_conclusion: '',
    user_id: admin.id,
    product_id: meta.products[0].id,
    strain_id: meta.strains[0].id,
    create_time: '2026-04-13 15:00:00',
    info: `显示名称：${batchName}`,
  })

  const batchesPayload = await get('/batches')
  return (batchesPayload.data || []).find((item) => item.batch_name === batchName)
}

const cleanupBatchData = async (batchId) => {
  const payload = await get(`/product-data/by-batch?batch_id=${batchId}`)
  for (const row of payload.data || []) {
    await del(`/product-data/${row.id}`)
  }
}

const main = async () => {
  const meta = JSON.parse(await fs.readFile(metadataPath, 'utf8'))
  const admin = await ensureAdmin()

  const chartSamples = []
  for (let index = 0; index < SAMPLES; index += 1) {
    const { duration, payload } = await timedGet(`/batches/${meta.chartBatchId}/chart`)
    chartSamples.push({
      duration: Number(duration.toFixed(3)),
      productSeries: Array.isArray(payload?.product?.series) ? payload.product.series.length : 0,
      tankSeries: Array.isArray(payload?.tank?.series) ? payload.tank.series.length : 0,
      tailGasSeries: Array.isArray(payload?.tailGas?.series) ? payload.tailGas.series.length : 0,
    })
  }

  const statsSamples = []
  for (let index = 0; index < SAMPLES; index += 1) {
    const { duration, payload } = await timedGet('/statistics/product-yields')
    statsSamples.push({
      duration: Number(duration.toFixed(3)),
      rows: Array.isArray(payload?.data) ? payload.data.length : Array.isArray(payload) ? payload.length : 0,
    })
  }

  const bulkResults = []
  for (const size of BULK_SIZES) {
    const samples = []
    for (let sampleIndex = 0; sampleIndex < SAMPLES; sampleIndex += 1) {
      const batch = await createBatch(meta, admin, size, sampleIndex + 1)
      const payload = Array.from({ length: size }, (_, index) => ({
        batch_id: batch.id,
        product_id: meta.products[0].id,
        time: sampleIndex * 100000 + index * 0.25,
        product: Number((25 + Math.sin(index / 20) * 4 + index * 0.01).toFixed(4)),
      }))

      const { duration } = await timedPost('/product-data/bulk', payload)
      samples.push(Number(duration.toFixed(3)))
      await cleanupBatchData(batch.id)
      await del(`/batches/${batch.id}`)
    }

    bulkResults.push({
      size,
      samples,
      average: Number(average(samples).toFixed(3)),
      min: Number(Math.min(...samples).toFixed(3)),
      max: Number(Math.max(...samples).toFixed(3)),
    })
  }

  console.log(JSON.stringify({
    prefix: meta.prefix,
    chart: {
      batchId: meta.chartBatchId,
      samples: chartSamples,
      averageDuration: Number(average(chartSamples.map((item) => item.duration)).toFixed(3)),
    },
    statistics: {
      samples: statsSamples,
      averageDuration: Number(average(statsSamples.map((item) => item.duration)).toFixed(3)),
    },
    bulkImport: bulkResults,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})