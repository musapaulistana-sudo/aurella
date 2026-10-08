import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const SRC_URL = 'https://kktzfayiojgsgqdvdazd.supabase.co'
const DEST_URL = 'https://mxslkryqrtrlclmcjvlb.supabase.co'
const SRC_HOST = 'kktzfayiojgsgqdvdazd.supabase.co'
const DEST_HOST = 'mxslkryqrtrlclmcjvlb.supabase.co'

const SRC_KEY = process.env.SRC_KEY
const DEST_KEY = process.env.DEST_KEY
if (!SRC_KEY || !DEST_KEY) {
  console.error('Missing SRC_KEY or DEST_KEY')
  process.exit(1)
}

const src = createClient(SRC_URL, SRC_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const dest = createClient(DEST_URL, DEST_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const CACHE = 'd:/atlascosmeticos/_migrate_tmp/data'
mkdirSync(CACHE, { recursive: true })

const STORE = {
  store_name: 'Reis Cosmeticos',
  logo_brand: 'Reis',
  logo_suffix: 'Cosmeticos',
  logo_tagline: null,
  company_legal_name: '69.459.781 RICHARD REIS DOS SANTOS',
  cnpj: '69.459.781/0001-83',
  contact_email: 'atendimento@reiscosmeticos.com.br',
  phone_area_code: '(31) ',
  phone_number: '9731-20260',
  phone_href: 'tel:+5531973120260',
  contact_whatsapp_href: 'https://wa.me/5531973120260',
  contact_whatsapp_label: 'WhatsApp',
  contact_address:
    'Rua Conceicao do Para, 460 - Santa Ines - Belo Horizonte - Minas Gerais - Cep: 31060-090',
  store_street: 'Rua Conceicao do Para',
  store_street_number: '460',
  store_neighborhood: 'Santa Ines',
  store_city: 'Belo Horizonte',
  store_state: 'MG',
  store_postal_code: '31060-090',
  store_country: 'BR',
  store_complement: null,
  seo_title: 'Reis Cosmeticos',
  seo_title_template: '%s | Reis Cosmeticos',
  seo_description: 'Reis Cosmeticos — produtos de beleza e cuidados.',
  logo_image_url: null,
  favicon_url: null,
  seo_og_image_url: null,
  google_analytics_id: null,
  google_tag_manager_id: null,
  google_ads_id: null,
  google_ads_conversion_id: null,
  microsoft_clarity_id: null,
  head_scripts: null,
  tracking_tags: [],
}

const ADMIN = {
  email: 'admin@reiscosmeticos.com.br',
  password: 'ReisAdmin2026!',
  name: 'Admin Reis',
}

async function fetchAll(client, table, orderCol = 'id') {
  const pageSize = 1000
  let from = 0
  const all = []
  for (;;) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .order(orderCol, { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data?.length) break
    all.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return all
}

async function upsertBatch(client, table, rows, onConflict = 'id') {
  if (!rows.length) return 0
  const chunk = 200
  let n = 0
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk)
    const { error } = await client.from(table).upsert(part, { onConflict })
    if (error) throw new Error(`upsert ${table}: ${error.message}`)
    n += part.length
  }
  return n
}

async function deleteAll(client, table) {
  // delete all rows via filter that matches everything
  const { error } = await client.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) {
    // composite PK tables
    const { error: e2 } = await client.from(table).delete().not('product_id', 'is', null)
    if (e2) console.warn(`delete ${table}:`, error.message, e2.message)
  }
}

function rewriteUrl(url) {
  if (typeof url !== 'string' || !url) return url
  return url.split(SRC_HOST).join(DEST_HOST)
}

function rewriteAtlasText(text) {
  if (typeof text !== 'string' || !text) return text
  return text
    .replace(/Atlas Cosmeticos/gi, 'Reis Cosmeticos')
    .replace(/Atlas Cosméticos/gi, 'Reis Cosméticos')
    .replace(/ATLAS NEGOCIOS INTEGRADOS LTDA/gi, STORE.company_legal_name)
    .replace(/67\.006\.230\/0001-39/g, STORE.cnpj)
    .replace(/atendimento@atlascosmeticos\.com/gi, STORE.contact_email)
    .replace(/Avenida Portugal, 1148[^<"]*/gi, STORE.contact_address)
}

async function ensureBuckets() {
  const needed = [
    { id: 'product-images', name: 'product-images', public: true },
    { id: 'categories', name: 'categories', public: true },
    { id: 'banners', name: 'banners', public: true },
    { id: 'site-assets', name: 'site-assets', public: true },
  ]
  const { data: existing } = await dest.storage.listBuckets()
  const names = new Set((existing || []).map((b) => b.name))
  for (const b of needed) {
    if (!names.has(b.name)) {
      const { error } = await dest.storage.createBucket(b.id, {
        public: b.public,
        fileSizeLimit: 5242880,
      })
      if (error) console.warn('bucket', b.name, error.message)
      else console.log('created bucket', b.name)
    }
  }
}

async function copyStorageObject(bucket, path) {
  const srcUrl = `${SRC_URL}/storage/v1/object/public/${bucket}/${path}`
  const res = await fetch(srcUrl)
  if (!res.ok) {
    // try authenticated download
    const { data, error } = await src.storage.from(bucket).download(path)
    if (error || !data) throw new Error(`download ${bucket}/${path}: ${error?.message || res.status}`)
    const buf = Buffer.from(await data.arrayBuffer())
    const contentType = data.type || 'application/octet-stream'
    const { error: upErr } = await dest.storage.from(bucket).upload(path, buf, {
      contentType,
      upsert: true,
    })
    if (upErr) throw new Error(`upload ${bucket}/${path}: ${upErr.message}`)
    return
  }
  const buf = Buffer.from(await res.arrayBuffer())
  const contentType = res.headers.get('content-type') || 'application/octet-stream'
  const { error: upErr } = await dest.storage.from(bucket).upload(path, buf, {
    contentType,
    upsert: true,
  })
  if (upErr) throw new Error(`upload ${bucket}/${path}: ${upErr.message}`)
}

async function copyMediaFiles(mediaRows) {
  const copyBuckets = new Set(['product-images', 'categories'])
  let ok = 0
  let fail = 0
  const concurrency = 8
  let i = 0
  async function worker() {
    while (i < mediaRows.length) {
      const row = mediaRows[i++]
      if (!copyBuckets.has(row.bucket)) continue
      try {
        await copyStorageObject(row.bucket, row.storage_path)
        ok++
        if (ok % 50 === 0) console.log(`storage copied ${ok}...`)
      } catch (e) {
        fail++
        if (fail < 10) console.warn('storage fail', row.bucket, row.storage_path, e.message)
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  console.log(`storage done ok=${ok} fail=${fail}`)
}

async function exportSource() {
  const tables = [
    ['brands', 'id'],
    ['categories', 'id'],
    ['products', 'id'],
    ['media_assets', 'id'],
    ['product_images', 'id'],
    ['product_categories', 'product_id'],
    ['site_settings', 'id'],
    ['footer_pages', 'id'],
    ['policy_links', 'id'],
    ['social_links', 'id'],
    ['menu_items', 'id'],
    ['footer_menus', 'id'],
    ['footer_menu_items', 'id'],
    ['footer_assets', 'id'],
    ['shipping_methods', 'id'],
  ]
  const data = {}
  for (const [table, order] of tables) {
    console.log('export', table)
    data[table] = await fetchAll(src, table, order)
    writeFileSync(join(CACHE, `${table}.json`), JSON.stringify(data[table]))
    console.log(' ', table, data[table].length)
  }
  return data
}

function loadCached() {
  const tables = [
    'brands',
    'categories',
    'products',
    'media_assets',
    'product_images',
    'product_categories',
    'site_settings',
    'footer_pages',
    'policy_links',
    'social_links',
    'menu_items',
    'footer_menus',
    'footer_menu_items',
    'footer_assets',
    'shipping_methods',
  ]
  const data = {}
  for (const t of tables) {
    const p = join(CACHE, `${t}.json`)
    if (!existsSync(p)) return null
    data[t] = JSON.parse(readFileSync(p, 'utf8'))
  }
  return data
}

async function clearDestContent() {
  // order matters for FKs
  const order = [
    'product_images',
    'product_categories',
    'products',
    'media_assets',
    'brands',
    'categories',
    'footer_menu_items',
    'footer_menus',
    'footer_assets',
    'footer_pages',
    'policy_links',
    'social_links',
    'menu_items',
    'shipping_methods',
    'home_banners',
  ]
  for (const t of order) {
    console.log('clear', t)
    if (t === 'product_categories') {
      await dest.from(t).delete().not('product_id', 'is', null)
      continue
    }
    if (t === 'menu_items') {
      // clear children first
      await dest.from(t).delete().not('parent_id', 'is', null)
      await dest.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000')
      continue
    }
    await dest.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000')
  }
}

async function importData(data) {
  // brands
  console.log('import brands', data.brands.length)
  await upsertBatch(dest, 'brands', data.brands)

  // categories with rewritten urls
  const categories = data.categories.map((c) => ({
    ...c,
    image_url: rewriteUrl(c.image_url),
    banner_image_url: rewriteUrl(c.banner_image_url),
    seal_image_url: rewriteUrl(c.seal_image_url),
  }))
  console.log('import categories', categories.length)
  await upsertBatch(dest, 'categories', categories)

  // media with rewritten urls, no uploaded_by
  const media = data.media_assets.map((m) => ({
    ...m,
    public_url: rewriteUrl(m.public_url),
    uploaded_by: null,
  }))
  console.log('import media_assets', media.length)
  await upsertBatch(dest, 'media_assets', media)

  // products
  const products = data.products.map((p) => ({
    ...p,
    images: Array.isArray(p.images) ? p.images.map(rewriteUrl) : p.images,
    description: rewriteAtlasText(p.description),
    short_description: rewriteAtlasText(p.short_description),
    meta_title: rewriteAtlasText(p.meta_title),
    meta_description: rewriteAtlasText(p.meta_description),
  }))
  console.log('import products', products.length)
  await upsertBatch(dest, 'products', products)

  console.log('import product_categories', data.product_categories.length)
  await upsertBatch(dest, 'product_categories', data.product_categories, 'product_id,category_id')

  console.log('import product_images', data.product_images.length)
  await upsertBatch(dest, 'product_images', data.product_images)

  // site settings — merge source payment/installment config + Reis identity
  const base = data.site_settings[0] || {}
  const settings = {
    ...base,
    ...STORE,
    logo_image_url: null,
    favicon_url: null,
    seo_og_image_url: null,
    google_analytics_id: null,
    google_tag_manager_id: null,
    google_ads_id: null,
    google_ads_conversion_id: null,
    microsoft_clarity_id: null,
    head_scripts: null,
    tracking_tags: [],
    store_description: rewriteAtlasText(base.store_description) || 'Reis Cosmeticos',
    footer_security_text: rewriteAtlasText(base.footer_security_text),
    footer_disclaimers: Array.isArray(base.footer_disclaimers)
      ? base.footer_disclaimers.map((d) =>
          typeof d === 'string' ? rewriteAtlasText(d) : d,
        )
      : [],
    updated_at: new Date().toISOString(),
  }
  // keep fixed id if present
  console.log('import site_settings')
  const { error: ssErr } = await dest.from('site_settings').upsert(settings, { onConflict: 'id' })
  if (ssErr) throw new Error('site_settings: ' + ssErr.message)

  const footerPages = data.footer_pages.map((p) => ({
    ...p,
    content: rewriteAtlasText(p.content),
    title: rewriteAtlasText(p.title),
    meta_description: rewriteAtlasText(p.meta_description),
  }))
  console.log('import footer_pages', footerPages.length)
  await upsertBatch(dest, 'footer_pages', footerPages)

  console.log('import policy_links', data.policy_links.length)
  await upsertBatch(dest, 'policy_links', data.policy_links)

  const social = data.social_links.map((s) => {
    if (s.type === 'whatsapp') {
      return {
        ...s,
        href: STORE.contact_whatsapp_href,
        display: STORE.phone_area_code + STORE.phone_number,
        label: 'WhatsApp',
      }
    }
    return s
  })
  console.log('import social_links', social.length)
  await upsertBatch(dest, 'social_links', social)

  // menu: parents first
  const menus = [...data.menu_items]
  const parents = menus.filter((m) => !m.parent_id)
  const children = menus.filter((m) => m.parent_id)
  console.log('import menu_items', menus.length)
  await upsertBatch(dest, 'menu_items', parents)
  await upsertBatch(dest, 'menu_items', children)

  console.log('import footer_menus', data.footer_menus.length)
  await upsertBatch(dest, 'footer_menus', data.footer_menus)
  console.log('import footer_menu_items', data.footer_menu_items.length)
  await upsertBatch(dest, 'footer_menu_items', data.footer_menu_items)

  // footer assets: skip brand images from site-assets if any; still import payment seals etc with rewritten urls
  const assets = data.footer_assets.map((a) => ({
    ...a,
    image_url: rewriteUrl(a.image_url),
  }))
  console.log('import footer_assets', assets.length)
  await upsertBatch(dest, 'footer_assets', assets)

  console.log('import shipping_methods', data.shipping_methods.length)
  await upsertBatch(dest, 'shipping_methods', data.shipping_methods)

  // ensure no home banners
  await dest.from('home_banners').delete().neq('id', '00000000-0000-0000-0000-000000000000')
}

async function createAdmin() {
  const { data: listed, error: listErr } = await dest.auth.admin.listUsers({ perPage: 200 })
  if (listErr) throw new Error('listUsers: ' + listErr.message)
  let user = listed?.users?.find((u) => u.email?.toLowerCase() === ADMIN.email.toLowerCase())
  if (!user) {
    const { data, error } = await dest.auth.admin.createUser({
      email: ADMIN.email,
      password: ADMIN.password,
      email_confirm: true,
      user_metadata: { name: ADMIN.name },
    })
    if (error) throw new Error('createUser: ' + error.message)
    user = data.user
    console.log('created auth user', user.id)
  } else {
    console.log('admin user exists', user.id)
    await dest.auth.admin.updateUserById(user.id, {
      password: ADMIN.password,
      email_confirm: true,
      user_metadata: { name: ADMIN.name },
    })
  }

  const { error: pErr } = await dest.from('profiles').upsert(
    { id: user.id, name: ADMIN.name, role: 'admin' },
    { onConflict: 'id' },
  )
  if (pErr) throw new Error('profile admin: ' + pErr.message)
  console.log('admin profile ready')
}

async function validate() {
  for (const t of [
    'products',
    'categories',
    'brands',
    'media_assets',
    'product_images',
    'footer_pages',
    'site_settings',
  ]) {
    const { count, error } = await dest.from(t).select('*', { count: 'exact', head: true })
    console.log('DEST', t, error ? error.message : count)
  }
  const { data: ss } = await dest
    .from('site_settings')
    .select(
      'store_name,cnpj,contact_email,company_legal_name,logo_image_url,google_ads_id,google_analytics_id',
    )
    .limit(1)
    .maybeSingle()
  console.log('settings', ss)
  const { count: banners } = await dest
    .from('home_banners')
    .select('*', { count: 'exact', head: true })
  console.log('home_banners', banners)
}

const step = process.argv[2] || 'all'

async function main() {
  console.log('step', step)
  await ensureBuckets()

  if (step === 'export' || step === 'all') {
    await exportSource()
  }

  let data = loadCached()
  if (!data) {
    data = await exportSource()
  }

  if (step === 'storage' || step === 'all') {
    console.log('copying storage for media...')
    await copyMediaFiles(data.media_assets)
    // also copy category images that may not be in media_assets
    for (const c of data.categories) {
      for (const field of ['image_url', 'banner_image_url', 'seal_image_url']) {
        const url = c[field]
        if (!url || !url.includes(SRC_HOST)) continue
        const m = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
        if (!m) continue
        const [, bucket, path] = m
        if (!['product-images', 'categories'].includes(bucket)) continue
        try {
          await copyStorageObject(bucket, decodeURIComponent(path))
        } catch (e) {
          console.warn('cat img', e.message)
        }
      }
    }
  }

  if (step === 'import' || step === 'all') {
    await clearDestContent()
    await importData(data)
    await createAdmin()
    await validate()
  }

  if (step === 'admin') {
    await createAdmin()
  }

  if (step === 'validate') {
    await validate()
  }

  console.log('DONE')
  console.log('ADMIN', ADMIN.email, ADMIN.password)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
