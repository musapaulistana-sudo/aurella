/**
 * Importa cosméticos do CSV PT WooCommerce para o Supabase da loja.
 * Uso: node --env-file=.env.local tmp/import-cosmetics-from-csv.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { readFileSync } from 'fs'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key)
const payload = JSON.parse(readFileSync('d:/cosmeticospt/tmp/cosmetics-payload.json', 'utf8'))
const keepBySku = new Map(payload.products.map((p) => [p.sku, p]))

function parseCsv(text) {
  const normalized = text.replace(/^\uFEFF/, '')
  const rows = []
  let row = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < normalized.length; i++) {
    const c = normalized[i]
    if (quoted) {
      if (c === '"' && normalized[i + 1] === '"') {
        cur += '"'
        i++
      } else if (c === '"') quoted = false
      else cur += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(cur)
      cur = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && normalized[i + 1] === '\n') i++
      row.push(cur)
      rows.push(row)
      row = []
      cur = ''
    } else cur += c
  }
  if (cur || row.length) {
    row.push(cur)
    rows.push(row)
  }
  return rows
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 180)
}

function parsePrice(v) {
  const n = parseFloat(String(v).replace(',', '.').trim())
  if (Number.isNaN(n) || n < 0) return null
  return Math.round(n * 100) / 100
}

function parseImages(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter((u) => /^https?:\/\//i.test(u))
}

async function ensureBrand(name, cache) {
  const keyName = name.toLowerCase()
  if (cache.has(keyName)) return cache.get(keyName)
  const slug = slugify(name) || 'marca'
  const { data: existing } = await supabase.from('brands').select('id').eq('slug', slug).maybeSingle()
  if (existing) {
    cache.set(keyName, existing.id)
    await supabase.from('brands').update({ active: true, name }).eq('id', existing.id)
    return existing.id
  }
  const { data, error } = await supabase
    .from('brands')
    .insert({ name, slug, active: true })
    .select('id')
    .single()
  if (error) throw new Error(`brand ${name}: ${error.message}`)
  cache.set(keyName, data.id)
  return data.id
}

async function ensureCategory(slug, name, cache) {
  if (cache.has(slug)) return cache.get(slug)
  const { data: existing } = await supabase.from('categories').select('id').eq('slug', slug).maybeSingle()
  if (existing) {
    cache.set(slug, existing.id)
    await supabase.from('categories').update({ active: true, name }).eq('id', existing.id)
    return existing.id
  }
  const { data, error } = await supabase
    .from('categories')
    .insert({ name, slug, active: true, sort_order: 50 })
    .select('id')
    .single()
  if (error) throw new Error(`cat ${slug}: ${error.message}`)
  cache.set(slug, data.id)
  return data.id
}

async function ensureMedia(imageUrl, alt) {
  const hash = createHash('md5').update(imageUrl).digest('hex')
  const storagePath = `external/${hash}`

  const { data: byPath } = await supabase
    .from('media_assets')
    .select('id')
    .eq('storage_path', storagePath)
    .maybeSingle()
  if (byPath) return byPath.id

  const { data: byUrl } = await supabase
    .from('media_assets')
    .select('id')
    .eq('public_url', imageUrl)
    .maybeSingle()
  if (byUrl) return byUrl.id

  const filename = imageUrl.split('/').pop()?.split('?')[0] || `${hash}.jpg`
  const { data, error } = await supabase
    .from('media_assets')
    .insert({
      public_url: imageUrl,
      storage_path: storagePath,
      filename,
      alt_text: alt?.slice(0, 200) || null,
      mime_type: 'image/jpeg',
      size_bytes: 1,
      bucket: 'product-images',
    })
    .select('id')
    .single()

  if (error) {
    const { data: again } = await supabase
      .from('media_assets')
      .select('id')
      .or(`storage_path.eq.${storagePath},public_url.eq.${imageUrl}`)
      .maybeSingle()
    if (again) return again.id
    throw new Error(`media: ${error.message}`)
  }
  return data.id
}

async function upsertProduct(row, meta, brandId, categoryIds, mediaIds) {
  const baseSlug = slugify(row.name) || slugify(row.sku)
  const slug = `${baseSlug}-${slugify(row.sku)}`.slice(0, 200)

  const payload = {
    name: row.name.slice(0, 200),
    slug,
    description: row.description || null,
    short_description: row.shortDescription || null,
    price: row.price,
    original_price: row.originalPrice,
    stock: row.stock,
    sku: row.sku,
    brand_id: brandId,
    category_id: categoryIds[0] || null,
    active: true,
    updated_at: new Date().toISOString(),
  }

  const { data: bySku } = await supabase.from('products').select('id').eq('sku', row.sku).maybeSingle()

  let productId
  if (bySku) {
    const { data, error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', bySku.id)
      .select('id')
      .single()
    if (error) throw new Error(`update ${row.sku}: ${error.message}`)
    productId = data.id
  } else {
    const { data, error } = await supabase.from('products').insert(payload).select('id').single()
    if (error) {
      // slug conflict
      const altSlug = `${slug}-${Date.now().toString(36)}`.slice(0, 200)
      const { data: retry, error: e2 } = await supabase
        .from('products')
        .insert({ ...payload, slug: altSlug })
        .select('id')
        .single()
      if (e2) throw new Error(`insert ${row.sku}: ${e2.message}`)
      productId = retry.id
    } else {
      productId = data.id
    }
  }

  await supabase.from('product_categories').delete().eq('product_id', productId)
  if (categoryIds.length) {
    await supabase.from('product_categories').insert(
      categoryIds.map((category_id) => ({ product_id: productId, category_id }))
    )
  }

  if (mediaIds.length) {
    await supabase.from('product_images').delete().eq('product_id', productId)
    await supabase.from('product_images').insert(
      mediaIds.map((media_id, sort_order) => ({ product_id: productId, media_id, sort_order }))
    )
  }

  return productId
}

async function main() {
  const raw = readFileSync('d:/cosmeticospt/opuscare_woocommerce_20260929_162928.csv', 'utf8')
  const rows = parseCsv(raw)
  const header = rows[0]
  const idx = Object.fromEntries(header.map((h, i) => [h, i]))

  // preços das variações por SKU ascendente (parent)
  const variationPriceByParent = new Map()
  for (const r of rows.slice(1)) {
    if ((r[idx['Tipo']] || '').toLowerCase() !== 'variation') continue
    const parentSku = (r[idx['Ascendente']] || '').trim()
    const p = parsePrice(r[idx['Preço promocional']]) || parsePrice(r[idx['Preço']])
    if (!parentSku || !p || p <= 0) continue
    const prev = variationPriceByParent.get(parentSku)
    if (!prev || p < prev) variationPriceByParent.set(parentSku, p)
  }

  const csvProducts = []
  for (const r of rows.slice(1)) {
    const tipo = (r[idx['Tipo']] || '').toLowerCase()
    if (tipo !== 'simple' && tipo !== 'variable') continue
    const sku = (r[idx['SKU']] || '').trim()
    if (!sku || !keepBySku.has(sku)) continue
    const name = (r[idx['Nome']] || '').trim()
    const promo = parsePrice(r[idx['Preço promocional']])
    const regular = parsePrice(r[idx['Preço']])
    let price = promo && regular && promo < regular ? promo : regular || promo
    if (!price || price <= 0) price = variationPriceByParent.get(sku) || null
    if (!price || price <= 0) continue
    csvProducts.push({
      sku,
      name,
      description: r[idx['Descrição']] || '',
      shortDescription: r[idx['Descrição curta']] || '',
      price,
      originalPrice: promo && regular && regular > promo ? regular : null,
      stock: parseInt(r[idx['Estoque']] || '50', 10) || 50,
      images: parseImages(r[idx['Imagens']]),
      meta: keepBySku.get(sku),
    })
  }

  console.log('CSV matches to import:', csvProducts.length)

  const brandCache = new Map()
  const catCache = new Map()
  const taxonomy = Object.fromEntries(payload.taxonomy.map((t) => [t.slug, t.name]))

  // ensure taxonomy cats
  for (const t of payload.taxonomy) {
    await ensureCategory(t.slug, t.name, catCache)
  }

  let created = 0
  let updated = 0
  let errors = 0

  for (let i = 0; i < csvProducts.length; i++) {
    const row = csvProducts[i]
    try {
      const { data: existing } = await supabase.from('products').select('id').eq('sku', row.sku).maybeSingle()
      const brandId = await ensureBrand(row.meta.brand, brandCache)
      const categoryIds = []
      for (const slug of row.meta.cats) {
        categoryIds.push(await ensureCategory(slug, taxonomy[slug] || slug, catCache))
      }

      const mediaIds = []
      for (const img of row.images.slice(0, 4)) {
        try {
          mediaIds.push(await ensureMedia(img, row.name))
        } catch (e) {
          console.warn('img fail', row.sku, e.message)
        }
      }

      await upsertProduct(row, row.meta, brandId, categoryIds, mediaIds)
      if (existing) updated++
      else created++
      if ((i + 1) % 25 === 0) console.log(`… ${i + 1}/${csvProducts.length}`)
    } catch (e) {
      errors++
      console.error('ERR', row.sku, e.message)
    }
  }

  const keepSkus = csvProducts.map((p) => p.sku)

  // deactivate non-cosmetics
  const { error: deactErr } = await supabase.rpc('exec_sql_noop').maybeSingle().catch(() => ({ error: null }))
  void deactErr

  // Use raw SQL via REST isn't available; do in batches with filter
  // Fetch all active skus and deactivate those not in keep
  const { data: allActive } = await supabase.from('products').select('id, sku').eq('active', true)
  const keepSet = new Set(keepSkus)
  const toDeactivate = (allActive || []).filter((p) => !p.sku || !keepSet.has(p.sku)).map((p) => p.id)

  for (let i = 0; i < toDeactivate.length; i += 100) {
    const chunk = toDeactivate.slice(i, i + 100)
    await supabase.from('products').update({ active: false, updated_at: new Date().toISOString() }).in('id', chunk)
  }

  // activate keep
  for (let i = 0; i < keepSkus.length; i += 100) {
    const chunk = keepSkus.slice(i, i + 100)
    await supabase.from('products').update({ active: true, updated_at: new Date().toISOString() }).in('sku', chunk)
  }

  // cleanup brands/categories via selects
  const { data: usedBrandIds } = await supabase.from('products').select('brand_id').eq('active', true)
  const usedBrands = new Set((usedBrandIds || []).map((r) => r.brand_id).filter(Boolean))
  const { data: allBrands } = await supabase.from('brands').select('id')
  for (const b of allBrands || []) {
    await supabase.from('brands').update({ active: usedBrands.has(b.id) }).eq('id', b.id)
  }

  const taxSlugs = new Set(payload.taxonomy.map((t) => t.slug))
  const { data: activePcs } = await supabase
    .from('product_categories')
    .select('category_id, product:products!inner(active)')
    .eq('product.active', true)
  const usedCatIds = new Set((activePcs || []).map((r) => r.category_id))
  const { data: cats } = await supabase.from('categories').select('id, slug')
  for (const c of cats || []) {
    const active = taxSlugs.has(c.slug) || usedCatIds.has(c.id)
    await supabase.from('categories').update({ active }).eq('id', c.id)
  }

  const { count: activeCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('active', true)

  console.log({ created, updated, errors, activeCount, deactivated: toDeactivate.length })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
