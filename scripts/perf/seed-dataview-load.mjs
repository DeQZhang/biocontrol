import fs from 'node:fs/promises'
import path from 'node:path'

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8080/api'
const PRODUCT_COUNT = Number(process.env.PERF_PRODUCTS || 12)
const STRAINS_PER_PRODUCT = Number(process.env.PERF_STRAINS_PER_PRODUCT || 4)
const DESIGNS_PER_STRAIN = Number(process.env.PERF_DESIGNS_PER_STRAIN || 5)
const BATCHES_PER_DESIGN = Number(process.env.PERF_BATCHES_PER_DESIGN || 3)
const STATS_POINTS_PER_PRODUCT = Number(process.env.PERF_STATS_POINTS_PER_PRODUCT || 12)
const CHART_POINTS = Number(process.env.PERF_CHART_POINTS || 1500)
const metadataPath = path.resolve('scripts/perf/.dataview-seed.json')

const prefix = process.env.PERF_PREFIX || `PF-${Date.now().toString(36).slice(-6)}`

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

const chunk = (list, size) => {
  const result = []
  for (let index = 0; index < list.length; index += size) {
    result.push(list.slice(index, index + size))
  }
  return result
}

const ensureAdmin = async () => {
  await post('/users/admin/init', {})
  const payload = await get('/users')
  const users = payload.data || []
  const admin = users.find((item) => item.account === 'Admin') || users[0]
  if (!admin) {
    throw new Error('无法获取 Admin 用户')
  }
  return admin
}

const listByPrefix = async (pathname, field) => {
  const payload = await get(pathname)
  return (payload.data || []).filter((item) => String(item?.[field] || '').includes(prefix))
}

const main = async () => {
  const admin = await ensureAdmin()

  console.log('Seeding prefix:', prefix)
  console.log('Scale:', JSON.stringify({
    products: PRODUCT_COUNT,
    strainsPerProduct: STRAINS_PER_PRODUCT,
    designsPerStrain: DESIGNS_PER_STRAIN,
    batchesPerDesign: BATCHES_PER_DESIGN,
    statsPointsPerProduct: STATS_POINTS_PER_PRODUCT,
    chartPoints: CHART_POINTS,
  }))

  const productNames = []
  for (let productIndex = 0; productIndex < PRODUCT_COUNT; productIndex += 1) {
    const productName = `${prefix}-P${String(productIndex + 1).padStart(2, '0')}`
    productNames.push(productName)
    await post('/products', {
      name: productName,
      number: `${1000 + productIndex}`,
      info: `压测产品 ${productIndex + 1}`,
    })
  }

  const products = await listByPrefix('/products', 'name')
  const productsByName = new Map(products.map((item) => [item.name, item]))

  const strainNames = []
  for (const productName of productNames) {
    const product = productsByName.get(productName)
    for (let strainIndex = 0; strainIndex < STRAINS_PER_PRODUCT; strainIndex += 1) {
      const strainName = `${productName}-S${String(strainIndex + 1).padStart(2, '0')}`
      strainNames.push(strainName)
      await post('/strains', {
        product_id: product.id,
        name: strainName,
        info: `压测菌株 ${strainIndex + 1}`,
      })
    }
  }

  const strains = await listByPrefix('/strains', 'name')
  const strainsByName = new Map(strains.map((item) => [item.name, item]))

  const designNames = []
  for (const strainName of strainNames) {
    const strain = strainsByName.get(strainName)
    for (let designIndex = 0; designIndex < DESIGNS_PER_STRAIN; designIndex += 1) {
      const designName = `${strainName}-D${String(designIndex + 1).padStart(2, '0')}`
      designNames.push(designName)
      await post('/experiment-designs', {
        name: designName,
        vessel_type: 'fermenter',
        product_id: strain.product_id,
        strain_id: strain.id,
        user_id: admin.id,
        previous_experiment_design_id: 0,
        design_background: `压测设计 ${designIndex + 1}`,
        design_items: JSON.stringify([{ batch_no: '01', plan: `计划-${designIndex + 1}`, note: `备注-${designIndex + 1}` }]),
        design_detail: `${designName}-X`,
        design_date: '2026-04-13',
        experiment_eval: '',
        experiment_conclusion: '',
        next_step_plan: '',
        create_time: '2026-04-13 10:00:00',
      })
    }
  }

  const designs = await listByPrefix('/experiment-designs', 'name')
  const designsByName = new Map(designs.map((item) => [item.name, item]))

  const batchNames = []
  for (const designName of designNames) {
    const design = designsByName.get(designName)
    for (let batchIndex = 0; batchIndex < BATCHES_PER_DESIGN; batchIndex += 1) {
      const batchName = `${designName}-B${String(batchIndex + 1).padStart(2, '0')}`
      batchNames.push(batchName)
      await post('/batches', {
        batch_name: batchName,
        experiment_design_id: design.id,
        vessel_type: 'fermenter',
        design_detail: design.design_detail,
        design_date: '2026-04-13',
        experiment_eval: batchIndex % 2 === 0 ? '性能压测运行中' : '性能压测已完成',
        experiment_conclusion: batchIndex % 2 === 0 ? '' : '压测样本已完成',
        user_id: admin.id,
        product_id: design.product_id,
        strain_id: design.strain_id,
        create_time: `2026-04-13 10:${String(batchIndex).padStart(2, '0')}:00`,
        start_time: `2026-04-13 11:${String(batchIndex).padStart(2, '0')}:00`,
        end_time: batchIndex % 2 === 0 ? '' : `2026-04-13 12:${String(batchIndex).padStart(2, '0')}:00`,
        info: `显示名称：${batchName}\n实验类型：发酵验证`,
      })
    }
  }

  const batches = await listByPrefix('/batches', 'batch_name')
  const batchesByProduct = new Map()
  for (const batch of batches) {
    const productId = Number(batch.product_id || 0)
    if (!batchesByProduct.has(productId)) {
      batchesByProduct.set(productId, [])
    }
    batchesByProduct.get(productId).push(batch)
  }

  const statsPayload = []
  for (const product of products) {
    const batch = (batchesByProduct.get(Number(product.id)) || [])[0]
    if (!batch) {
      continue
    }
    for (let pointIndex = 0; pointIndex < STATS_POINTS_PER_PRODUCT; pointIndex += 1) {
      statsPayload.push({
        batch_id: batch.id,
        product_id: product.id,
        time: 1000 + pointIndex,
        product: Number((10 + pointIndex + (product.id % 7)).toFixed(3)),
      })
    }
  }

  const chartBatch = batches[0]
  const chartPayload = Array.from({ length: CHART_POINTS }, (_, index) => ({
    batch_id: chartBatch.id,
    product_id: chartBatch.product_id,
    time: index * 0.25,
    product: Number((20 + Math.sin(index / 15) * 5 + index * 0.01).toFixed(4)),
  }))

  for (const payloadChunk of chunk([...statsPayload, ...chartPayload], 500)) {
    await post('/product-data/bulk', payloadChunk)
  }

  const metadata = {
    prefix,
    createdAt: new Date().toISOString(),
    scale: {
      products: PRODUCT_COUNT,
      strainsPerProduct: STRAINS_PER_PRODUCT,
      designsPerStrain: DESIGNS_PER_STRAIN,
      batchesPerDesign: BATCHES_PER_DESIGN,
      statsPointsPerProduct: STATS_POINTS_PER_PRODUCT,
      chartPoints: CHART_POINTS,
    },
    admin: { id: admin.id, account: admin.account, name: admin.name },
    products: products.map((item) => ({ id: item.id, name: item.name })),
    strains: strains.map((item) => ({ id: item.id, name: item.name, product_id: item.product_id })),
    designs: designs.map((item) => ({ id: item.id, name: item.name, product_id: item.product_id, strain_id: item.strain_id })),
    batches: batches.map((item) => ({ id: item.id, batch_name: item.batch_name, experiment_design_id: item.experiment_design_id, product_id: item.product_id, strain_id: item.strain_id })),
    firstProductName: products[0]?.name || '',
    firstStrainName: strains[0]?.name || '',
    firstDesignName: designs[0]?.name || '',
    firstBatchId: batches[0]?.id || 0,
    chartBatchId: chartBatch?.id || 0,
    chartProductId: chartBatch?.product_id || 0,
  }

  await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8')

  console.log(JSON.stringify({
    metadataPath,
    prefix,
    summary: {
      products: products.length,
      strains: strains.length,
      designs: designs.length,
      batches: batches.length,
      statsRows: statsPayload.length,
      chartRows: chartPayload.length,
    },
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})