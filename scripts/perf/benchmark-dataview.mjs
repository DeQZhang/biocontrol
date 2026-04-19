import { performance } from 'node:perf_hooks'

const DESIGN_COUNT = 5000
const LOOKUP_COUNT = 100000
const BATCH_COUNT = 20000
const SELECTED_COUNT = 4000
const NODE_COUNT = 30000

const normalize = (value) => String(value || '').trim().toLowerCase()

const measure = (label, fn) => {
  const start = performance.now()
  const result = fn()
  const duration = performance.now() - start
  return {
    label,
    durationMs: Number(duration.toFixed(3)),
    result,
  }
}

const printBlock = (title, rows) => {
  console.log(`\n[${title}]`)
  rows.forEach((row) => {
    console.log(`${row.label}: ${row.durationMs} ms`)
  })
}

const designs = Array.from({ length: DESIGN_COUNT }, (_, index) => ({
  id: index + 1,
  name: `设计-${index + 1}`,
  design_items: JSON.stringify([{ plate_format: '96', doe_experiment_type: index % 2 === 0 ? 'pb' : 'bb' }]),
}))

const designIds = Array.from({ length: LOOKUP_COUNT }, (_, index) => (index % DESIGN_COUNT) + 1)

const lookupWithFind = () => {
  let found = 0
  for (const designId of designIds) {
    if (designs.find((item) => Number(item.id) === Number(designId))) {
      found += 1
    }
  }
  return found
}

const designMap = new Map(designs.map((item) => [Number(item.id), item]))

const lookupWithMap = () => {
  let found = 0
  for (const designId of designIds) {
    if (designMap.get(Number(designId))) {
      found += 1
    }
  }
  return found
}

const batches = Array.from({ length: BATCH_COUNT }, (_, index) => ({
  id: index + 1,
  batch_name: `批次-${index + 1}`,
}))

const selectedIds = Array.from({ length: SELECTED_COUNT }, (_, index) => ((index * 3) % BATCH_COUNT) + 1)

const compareWithIncludes = () => batches.filter((item) => selectedIds.includes(item.id)).length
const selectedIdSet = new Set(selectedIds)
const compareWithSet = () => batches.filter((item) => selectedIdSet.has(item.id)).length

const nodes = Array.from({ length: NODE_COUNT }, (_, index) => ({
  baseName: `产品-${index}`,
  displayName: `产品-${index}-显示`,
  progressText: index % 3 === 0 ? '已完成' : '运行中',
  highestYieldText: String((index % 97) + 1),
  info: `备注-${index}`,
  searchBlob: normalize([
    `产品-${index}`,
    `产品-${index}-显示`,
    index % 3 === 0 ? '已完成' : '运行中',
    String((index % 97) + 1),
    `备注-${index}`,
  ].join(' | ')),
}))

const searchKeyword = '产品-199'

const getNodeSearchValues = (node) => [
  node.baseName,
  node.displayName,
  node.progressText,
  node.highestYieldText,
  node.info,
]

const matchWithDynamicValues = () => {
  let matched = 0
  for (const node of nodes) {
    const hit = getNodeSearchValues(node)
      .map((value) => normalize(value))
      .some((value) => value.includes(searchKeyword))
    if (hit) {
      matched += 1
    }
  }
  return matched
}

const matchWithSearchBlob = () => {
  let matched = 0
  for (const node of nodes) {
    if (node.searchBlob.includes(searchKeyword)) {
      matched += 1
    }
  }
  return matched
}

const lookupResults = [
  measure('旧实现 Array.find', lookupWithFind),
  measure('新实现 Map.get', lookupWithMap),
]

const compareResults = [
  measure('旧实现 includes 过滤', compareWithIncludes),
  measure('新实现 Set.has 过滤', compareWithSet),
]

const searchResults = [
  measure('旧实现动态拼接搜索字段', matchWithDynamicValues),
  measure('新实现 searchBlob 命中', matchWithSearchBlob),
]

printBlock('设计索引查找', lookupResults)
printBlock('批次比对筛选', compareResults)
printBlock('节点搜索匹配', searchResults)

console.log('\n[样本规模]')
console.log(`designs=${DESIGN_COUNT}, lookups=${LOOKUP_COUNT}, batches=${BATCH_COUNT}, selected=${SELECTED_COUNT}, nodes=${NODE_COUNT}`)