import fs from 'node:fs/promises'
import path from 'node:path'

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8080/api'
const metadataPath = path.resolve('scripts/perf/.dataview-seed.json')

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

const get = (pathname) => request(pathname)
const del = (pathname) => request(pathname, { method: 'DELETE' })

const safe = async (task) => {
  try {
    await task()
  } catch (error) {
    console.warn(String(error?.message || error))
  }
}

const main = async () => {
  const meta = JSON.parse(await fs.readFile(metadataPath, 'utf8'))

  for (const batch of meta.batches || []) {
    await safe(async () => {
      const payload = await get(`/product-data/by-batch?batch_id=${batch.id}`)
      for (const row of payload.data || []) {
        await safe(() => del(`/product-data/${row.id}`))
      }
    })
  }

  for (const batch of [...(meta.batches || [])].sort((left, right) => Number(right.id) - Number(left.id))) {
    await safe(() => del(`/batches/${batch.id}`))
  }

  for (const design of [...(meta.designs || [])].sort((left, right) => Number(right.id) - Number(left.id))) {
    await safe(() => del(`/experiment-designs/${design.id}`))
  }

  for (const strain of [...(meta.strains || [])].sort((left, right) => Number(right.id) - Number(left.id))) {
    await safe(() => del(`/strains/${strain.id}`))
  }

  for (const product of [...(meta.products || [])].sort((left, right) => Number(right.id) - Number(left.id))) {
    await safe(() => del(`/products/${product.id}`))
  }

  await safe(() => fs.unlink(metadataPath))
  console.log(JSON.stringify({ cleanedPrefix: meta.prefix }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})