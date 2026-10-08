import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SRC_URL = 'https://kktzfayiojgsgqdvdazd.supabase.co'
const DEST_URL = 'https://mxslkryqrtrlclmcjvlb.supabase.co'
const dest = createClient(DEST_URL, process.env.DEST_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const media = JSON.parse(
  readFileSync('d:/atlascosmeticos/_migrate_tmp/data/media_assets.json', 'utf8'),
)

async function copyOne(bucket, path) {
  const url = `${SRC_URL}/storage/v1/object/public/${bucket}/${path}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('http ' + res.status)
  const buf = Buffer.from(await res.arrayBuffer())
  const ct = res.headers.get('content-type') || 'application/octet-stream'
  const { error } = await dest.storage.from(bucket).upload(path, buf, {
    contentType: ct,
    upsert: true,
  })
  if (error) throw new Error(error.message)
}

let ok = 0
let fail = 0
for (const m of media) {
  if (!['product-images', 'categories'].includes(m.bucket)) continue
  try {
    await copyOne(m.bucket, m.storage_path)
    ok++
  } catch {
    await new Promise((r) => setTimeout(r, 400))
    try {
      await copyOne(m.bucket, m.storage_path)
      ok++
    } catch (e2) {
      fail++
      if (fail <= 25) console.log('fail', m.storage_path, e2.message)
    }
  }
  if (ok % 100 === 0) console.log('ok', ok)
}
console.log({ ok, fail })
