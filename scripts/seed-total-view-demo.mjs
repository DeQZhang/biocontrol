const base = 'http://localhost:8080'

const request = async (method, path, body, query) => {
  const url = new URL(`${base}${path}`)
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const payload = text ? JSON.parse(text) : null
  if (!res.ok) {
    throw new Error(`${method} ${path} failed: ${JSON.stringify(payload)}`)
  }
  return payload?.data ?? payload
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const ensureReady = async () => {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const health = await fetch(`${base}/api/health`)
      if (health.ok) {
        return
      }
    } catch {}
    await sleep(1000)
  }
  throw new Error('service not ready on :8080')
}

const ensureByName = async ({ listPath, createPath, listKey = 'name', createPayload, targetValue }) => {
  const items = await request('GET', listPath)
  let found = (items || []).find(item => String(item?.[listKey] || '') === targetValue)
  if (found) {
    return found
  }

  await request('POST', createPath, createPayload)
  const refreshed = await request('GET', listPath)
  found = (refreshed || []).find(item => String(item?.[listKey] || '') === targetValue)
  if (!found) {
    throw new Error(`unable to find created item: ${targetValue}`)
  }
  return found
}

const ensureGroupDetail = async (groupId, userId) => {
  const details = await request('GET', '/api/group-details')
  const existing = (details || []).find(item => Number(item.group_id) === Number(groupId) && Number(item.user_id) === Number(userId))
  if (existing) {
    return existing
  }
  await request('POST', '/api/group-details', {
    group_id: groupId,
    user_id: userId,
    permission: 1,
  })
  const refreshed = await request('GET', '/api/group-details')
  return (refreshed || []).find(item => Number(item.group_id) === Number(groupId) && Number(item.user_id) === Number(userId))
}

const ensureExperimentDesign = async ({ name, vesselType, productId, strainId, userId, detail }) => {
  const designs = await request('GET', '/api/experiment-designs')
  let found = (designs || []).find(item => String(item?.name || '') === name)
  if (found) {
    return found
  }

  await request('POST', '/api/experiment-designs', {
    name,
    vessel_type: vesselType,
    product_id: productId,
    strain_id: strainId,
    user_id: userId,
    previous_experiment_design_id: 0,
    design_background: `${name} 演示背景`,
    design_items: JSON.stringify([{ batch_no: '01', plan: detail, note: '', experiment_type: vesselType }]),
    design_detail: detail,
    design_date: '2026-04-18',
    experiment_eval: '',
    experiment_conclusion: '',
    next_step_plan: '',
    create_time: '2026-04-18',
  })

  const refreshed = await request('GET', '/api/experiment-designs')
  found = (refreshed || []).find(item => String(item?.name || '') === name)
  if (!found) {
    throw new Error(`unable to find created design: ${name}`)
  }
  return found
}

const ensureBatch = async ({ batchName, vesselType, designId, designDetail, userId, productId, strainId, info, tankId = 0 }) => {
  const batches = await request('GET', '/api/batches')
  let found = (batches || []).find(item => String(item?.batch_name || '') === batchName)
  if (found) {
    return found
  }

  await request('POST', '/api/batches', {
    batch_name: batchName,
    vessel_type: vesselType,
    experiment_design_id: designId,
    design_detail: designDetail,
    design_date: '2026-04-18',
    experiment_eval: '',
    experiment_conclusion: '',
    tank_id: tankId,
    user_id: userId,
    product_id: productId,
    strain_id: strainId,
    create_time: '2026-04-18',
    start_time: '2026-04-18 08:00:00',
    end_time: '2026-04-19 20:00:00',
    info,
  })

  const refreshed = await request('GET', '/api/batches')
  found = (refreshed || []).find(item => String(item?.batch_name || '') === batchName)
  if (!found) {
    throw new Error(`unable to find created batch: ${batchName}`)
  }
  return found
}

const ensureProductData = async ({ batchId, productId, points }) => {
  const existing = await request('GET', '/api/product-data/by-batch', undefined, { batch_id: batchId })
  if ((existing || []).length) {
    return existing
  }

  for (const point of points) {
    await request('POST', '/api/product-data', {
      batch_id: batchId,
      product_id: productId,
      time: point.time,
      od: point.od,
      wet_weight: point.wet_weight,
      c1_conc: 0,
      c2_conc: 0,
      n_conc: 0,
      p_conc: 0,
      product: point.product,
      info: point.info,
    })
  }

  return request('GET', '/api/product-data/by-batch', undefined, { batch_id: batchId })
}

await ensureReady()

const products = {
  nanoCarrier: await ensureByName({
    listPath: '/api/products',
    createPath: '/api/products',
    createPayload: { name: '总览演示-胭脂红', info: '总览页演示产品', create_time: '2026-04-18' },
    targetValue: '总览演示-胭脂红',
  }),
  peptide: await ensureByName({
    listPath: '/api/products',
    createPath: '/api/products',
    createPayload: { name: '总览演示-多肽酶', info: '团队项目演示产品', create_time: '2026-04-18' },
    targetValue: '总览演示-多肽酶',
  }),
  polysaccharide: await ensureByName({
    listPath: '/api/products',
    createPath: '/api/products',
    createPayload: { name: '总览演示-褐藻糖胶', info: '团队项目演示产品', create_time: '2026-04-18' },
    targetValue: '总览演示-褐藻糖胶',
  }),
  surfactin: await ensureByName({
    listPath: '/api/products',
    createPath: '/api/products',
    createPayload: { name: '总览演示-脂肽素', info: '团队项目演示产品', create_time: '2026-04-18' },
    targetValue: '总览演示-脂肽素',
  }),
  vitamin: await ensureByName({
    listPath: '/api/products',
    createPath: '/api/products',
    createPayload: { name: '总览演示-维生素K2', info: '团队项目演示产品', create_time: '2026-04-18' },
    targetValue: '总览演示-维生素K2',
  }),
}

const users = {
  li: await ensureByName({
    listPath: '/api/users',
    createPath: '/api/users',
    createPayload: { name: '总览演示-李青', account: 'tv_demo_liqing', password: '123456', phone: '13800000011', permission: 1 },
    targetValue: '总览演示-李青',
  }),
  zhou: await ensureByName({
    listPath: '/api/users',
    createPath: '/api/users',
    createPayload: { name: '总览演示-周岚', account: 'tv_demo_zhoulan', password: '123456', phone: '13800000012', permission: 1 },
    targetValue: '总览演示-周岚',
  }),
  wang: await ensureByName({
    listPath: '/api/users',
    createPath: '/api/users',
    createPayload: { name: '总览演示-王澈', account: 'tv_demo_wangche', password: '123456', phone: '13800000013', permission: 1 },
    targetValue: '总览演示-王澈',
  }),
  sun: await ensureByName({
    listPath: '/api/users',
    createPath: '/api/users',
    createPayload: { name: '总览演示-孙越', account: 'tv_demo_sunyue', password: '123456', phone: '13800000014', permission: 1 },
    targetValue: '总览演示-孙越',
  }),
  he: await ensureByName({
    listPath: '/api/users',
    createPath: '/api/users',
    createPayload: { name: '总览演示-何川', account: 'tv_demo_hechuan', password: '123456', phone: '13800000015', permission: 1 },
    targetValue: '总览演示-何川',
  }),
  qin: await ensureByName({
    listPath: '/api/users',
    createPath: '/api/users',
    createPayload: { name: '总览演示-秦川', account: 'tv_demo_qinchuan', password: '123456', phone: '13800000016', permission: 1 },
    targetValue: '总览演示-秦川',
  }),
}

const groups = {
  alpha: await ensureByName({
    listPath: '/api/groups',
    createPath: '/api/groups',
    createPayload: { name: '总览演示-A组', info: '总览页团队演示数据', parent_id: 0 },
    targetValue: '总览演示-A组',
  }),
  beta: await ensureByName({
    listPath: '/api/groups',
    createPath: '/api/groups',
    createPayload: { name: '总览演示-B组', info: '总览页团队演示数据', parent_id: 0 },
    targetValue: '总览演示-B组',
  }),
}

await ensureGroupDetail(groups.alpha.id, users.li.id)
await ensureGroupDetail(groups.alpha.id, users.zhou.id)
await ensureGroupDetail(groups.alpha.id, users.sun.id)
await ensureGroupDetail(groups.alpha.id, users.he.id)
await ensureGroupDetail(groups.beta.id, users.wang.id)
await ensureGroupDetail(groups.beta.id, users.qin.id)

const strains = {
  alpha: await ensureByName({
    listPath: '/api/strains',
    createPath: '/api/strains',
    listKey: 'name',
    createPayload: { product_id: products.nanoCarrier.id, parent_id: 0, name: '总览演示-菌株A', info: '图2演示菌株', create_time: '2026-04-18' },
    targetValue: '总览演示-菌株A',
  }),
  beta: await ensureByName({
    listPath: '/api/strains',
    createPath: '/api/strains',
    listKey: 'name',
    createPayload: { product_id: products.nanoCarrier.id, parent_id: 0, name: '总览演示-菌株B', info: '图2演示菌株', create_time: '2026-04-18' },
    targetValue: '总览演示-菌株B',
  }),
  gamma: await ensureByName({
    listPath: '/api/strains',
    createPath: '/api/strains',
    listKey: 'name',
    createPayload: { product_id: products.nanoCarrier.id, parent_id: 0, name: '总览演示-菌株C', info: '图2演示菌株', create_time: '2026-04-18' },
    targetValue: '总览演示-菌株C',
  }),
  peptide: await ensureByName({
    listPath: '/api/strains',
    createPath: '/api/strains',
    listKey: 'name',
    createPayload: { product_id: products.peptide.id, parent_id: 0, name: '总览演示-多肽菌株', info: '团队项目演示菌株', create_time: '2026-04-18' },
    targetValue: '总览演示-多肽菌株',
  }),
  polysaccharide: await ensureByName({
    listPath: '/api/strains',
    createPath: '/api/strains',
    listKey: 'name',
    createPayload: { product_id: products.polysaccharide.id, parent_id: 0, name: '总览演示-糖胶菌株', info: '团队项目演示菌株', create_time: '2026-04-18' },
    targetValue: '总览演示-糖胶菌株',
  }),
  surfactin: await ensureByName({
    listPath: '/api/strains',
    createPath: '/api/strains',
    listKey: 'name',
    createPayload: { product_id: products.surfactin.id, parent_id: 0, name: '总览演示-脂肽素菌株', info: '团队项目演示菌株', create_time: '2026-04-18' },
    targetValue: '总览演示-脂肽素菌株',
  }),
  vitamin: await ensureByName({
    listPath: '/api/strains',
    createPath: '/api/strains',
    listKey: 'name',
    createPayload: { product_id: products.vitamin.id, parent_id: 0, name: '总览演示-K2菌株', info: '团队项目演示菌株', create_time: '2026-04-18' },
    targetValue: '总览演示-K2菌株',
  }),
}

const microplateSeeds = [
  { key: 'A1', strain: strains.alpha, user: users.li, yield: 6.8, times: [0, 12, 24], values: [2.1, 4.3, 6.8] },
  { key: 'A2', strain: strains.alpha, user: users.li, yield: 7.2, times: [0, 10, 22], values: [2.4, 5.1, 7.2] },
  { key: 'B1', strain: strains.beta, user: users.zhou, yield: 8.4, times: [0, 8, 18], values: [3.0, 5.9, 8.4] },
  { key: 'B2', strain: strains.beta, user: users.zhou, yield: 8.9, times: [0, 8, 20], values: [3.2, 6.1, 8.9] },
  { key: 'C1', strain: strains.gamma, user: users.li, yield: 5.7, times: [0, 9, 21], values: [1.8, 3.7, 5.7] },
]

for (const seed of microplateSeeds) {
  const design = await ensureExperimentDesign({
    name: `总览演示-MP-${seed.key}`,
    vesselType: 'microplate',
    productId: products.nanoCarrier.id,
    strainId: seed.strain.id,
    userId: seed.user.id,
    detail: `${seed.strain.name} 微孔板筛选`,
  })
  const batch = await ensureBatch({
    batchName: `TVD-MP-${seed.key}`,
    vesselType: 'microplate',
    designId: design.id,
    designDetail: `${seed.strain.name} 微孔板筛选`,
    userId: seed.user.id,
    productId: products.nanoCarrier.id,
    strainId: seed.strain.id,
    info: `${seed.strain.name} 演示批次`,
  })
  await ensureProductData({
    batchId: batch.id,
    productId: products.nanoCarrier.id,
    points: seed.times.map((time, index) => ({
      time,
      od: 0.8 + index * 0.15,
      wet_weight: 1.2 + index * 0.2,
      product: seed.values[index],
      info: `${seed.strain.name} 时序点 ${index + 1}`,
    })),
  })
}

const fermenterSeeds = [
  { batchName: 'TVD-F-A1', designName: '总览演示-F-A1', group: groups.alpha, user: users.li, product: products.nanoCarrier, strain: strains.alpha, info: 'A组 李青 发酵罐项目 胭脂红' },
  { batchName: 'TVD-F-A2', designName: '总览演示-F-A2', group: groups.alpha, user: users.li, product: products.peptide, strain: strains.peptide, info: 'A组 李青 发酵罐项目 多肽酶' },
  { batchName: 'TVD-F-A3', designName: '总览演示-F-A3', group: groups.alpha, user: users.zhou, product: products.polysaccharide, strain: strains.polysaccharide, info: 'A组 周岚 发酵罐项目 褐藻糖胶' },
  { batchName: 'TVD-F-A4', designName: '总览演示-F-A4', group: groups.alpha, user: users.zhou, product: products.nanoCarrier, strain: strains.beta, info: 'A组 周岚 发酵罐项目 胭脂红' },
  { batchName: 'TVD-F-A5', designName: '总览演示-F-A5', group: groups.alpha, user: users.sun, product: products.surfactin, strain: strains.surfactin, info: 'A组 孙越 发酵罐项目 脂肽素' },
  { batchName: 'TVD-F-A6', designName: '总览演示-F-A6', group: groups.alpha, user: users.sun, product: products.vitamin, strain: strains.vitamin, info: 'A组 孙越 发酵罐项目 维生素K2' },
  { batchName: 'TVD-F-A7', designName: '总览演示-F-A7', group: groups.alpha, user: users.he, product: products.nanoCarrier, strain: strains.gamma, info: 'A组 何川 发酵罐项目 胭脂红' },
  { batchName: 'TVD-F-A8', designName: '总览演示-F-A8', group: groups.alpha, user: users.he, product: products.peptide, strain: strains.peptide, info: 'A组 何川 发酵罐项目 多肽酶' },
  { batchName: 'TVD-F-A9', designName: '总览演示-F-A9', group: groups.alpha, user: users.li, product: products.vitamin, strain: strains.vitamin, info: 'A组 李青 发酵罐项目 维生素K2' },
  { batchName: 'TVD-F-A10', designName: '总览演示-F-A10', group: groups.alpha, user: users.zhou, product: products.surfactin, strain: strains.surfactin, info: 'A组 周岚 发酵罐项目 脂肽素' },
  { batchName: 'TVD-F-B1', designName: '总览演示-F-B1', group: groups.beta, user: users.wang, product: products.peptide, strain: strains.peptide, info: 'B组 王澈 发酵罐项目 多肽酶' },
  { batchName: 'TVD-F-B2', designName: '总览演示-F-B2', group: groups.beta, user: users.wang, product: products.polysaccharide, strain: strains.polysaccharide, info: 'B组 王澈 发酵罐项目 褐藻糖胶' },
  { batchName: 'TVD-F-B3', designName: '总览演示-F-B3', group: groups.beta, user: users.qin, product: products.surfactin, strain: strains.surfactin, info: 'B组 秦川 发酵罐项目 脂肽素' },
  { batchName: 'TVD-F-B4', designName: '总览演示-F-B4', group: groups.beta, user: users.qin, product: products.vitamin, strain: strains.vitamin, info: 'B组 秦川 发酵罐项目 维生素K2' },
]

for (const seed of fermenterSeeds) {
  const design = await ensureExperimentDesign({
    name: seed.designName,
    vesselType: 'fermenter',
    productId: seed.product.id,
    strainId: seed.strain.id,
    userId: seed.user.id,
    detail: `${seed.product.name} 发酵罐放大`,
  })
  const batch = await ensureBatch({
    batchName: seed.batchName,
    vesselType: 'fermenter',
    designId: design.id,
    designDetail: `${seed.product.name} 发酵罐放大`,
    userId: seed.user.id,
    productId: seed.product.id,
    strainId: seed.strain.id,
    info: seed.info,
  })
  await ensureProductData({
    batchId: batch.id,
    productId: seed.product.id,
    points: [
      { time: 0, od: 0.9, wet_weight: 1.3, product: 1.2, info: `${seed.batchName} 初始` },
      { time: 18, od: 1.4, wet_weight: 2.1, product: 3.8, info: `${seed.batchName} 中期` },
      { time: 36, od: 1.8, wet_weight: 2.7, product: 6.5, info: `${seed.batchName} 终点` },
    ],
  })
}

const summary = {
  products: Object.values(products).map(item => ({ id: item.id, name: item.name })),
  users: Object.values(users).map(item => ({ id: item.id, name: item.name })),
  groups: Object.values(groups).map(item => ({ id: item.id, name: item.name })),
  strains: Object.values(strains).map(item => ({ id: item.id, name: item.name, product_id: item.product_id })),
  microplateBatches: microplateSeeds.map(item => item.batchName),
  fermenterBatches: fermenterSeeds.map(item => item.batchName),
}

console.log(JSON.stringify(summary, null, 2))