/**
 * Importação Firme Forte — apenas produtos novos.
 * Uso: node --env-file=.env.local scripts/import-firme-forte.mjs [csvPath]
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const csvPath =
  process.argv[2]?.trim() ||
  'c:/importarprodutos/exportados/firme_forte_novos_vs_atlas_20260806_140803_woocommerce.csv'

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const CATEGORY_MAP = {
  'Fraldas e Lenços': 'Fraldas e Lenços Umedecidos',
  'Protetor Solar': 'Proteção Solar',
  'Cuidado Facial': 'Cuidados com a Pele',
  // Suplementos e Vitaminas → criar nova (sem mapear)
}

const BRAND_ALIAS = {
  "l'oreal paris": "L'Oréal",
  "l'oréal paris": "L'Oréal",
  "l'oreal professionnel": "L'Oréal",
  "l'oréal professionnel": "L'Oréal",
  isdin: 'ISDIN',
  'lancôme': 'Lancome',
  lancome: 'Lancome',
  skinceuticals: 'Skinceuticals',
  avene: 'Avêne',
  avène: 'Avêne',
  cerave: 'CeraVe',
}

const MAX_WIDTH = 1200
const MAX_HEIGHT = 1200
const WEBP_QUALITY = 85
const MAX_INPUT_BYTES = 10 * 1024 * 1024

function parseCsv(text) {
  const rows = []
  let row = []
  let cur = ''
  let q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cur += '"'
        i++
      } else if (c === '"') q = false
      else cur += c
    } else if (c === '"') q = true
    else if (c === ',') {
      row.push(cur)
      cur = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
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

function slugify(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200)
}

function normalizeName(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[·•]/g, ' ')
    .replace(/[''`´]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenSetKey(s) {
  return [...new Set(normalizeName(s).split(' ').filter((t) => t.length > 1))].sort().join(' ')
}

function normalizeGtin(s) {
  if (!s) return null
  const d = String(s).replace(/\D/g, '')
  return d.length >= 8 ? d : null
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
}

function parsePrice(v) {
  const n = parseFloat(String(v).replace(',', '.').trim())
  if (Number.isNaN(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

function parseImages(raw) {
  if (!raw?.trim()) return []
  return [
    ...new Set(
      raw
        .split(',')
        .map((u) => u.trim())
        .filter((u) => /^https?:\/\//i.test(u))
    ),
  ]
}

function parseCategories(raw) {
  if (!raw?.trim()) return []
  return [...new Set(raw.split(',').map((c) => c.trim()).filter(Boolean))]
}

async function fetchAll(table, columns) {
  const pageSize = 1000
  let from = 0
  const all = []
  for (;;) {
    const { data, error } = await admin.from(table).select(columns).range(from, from + pageSize - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    all.push(...(data ?? []))
    if (!data || data.length < pageSize) break
    from += pageSize
  }
  return all
}

async function optimizeProductImage(file) {
  if (file.byteLength > MAX_INPUT_BYTES) throw new Error('Imagem muito grande')
  const image = sharp(file, { failOn: 'none' })
  const metadata = await image.metadata()
  if (!metadata.width || !metadata.height) throw new Error('Imagem inválida')
  const buffer = await image
    .rotate()
    .resize({
      width: MAX_WIDTH,
      height: MAX_HEIGHT,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer()
  return { buffer, size: buffer.byteLength, mimeType: 'image/webp', extension: 'webp' }
}

async function downloadRemoteImage(imageUrl) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  try {
    const res = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'LojaCosmeticos-ProductImport/1.0',
        Accept: 'image/*',
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.startsWith('image/')) throw new Error('Resposta não é imagem')
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.byteLength > MAX_INPUT_BYTES) throw new Error('Imagem excede tamanho máximo')
    return buffer
  } finally {
    clearTimeout(timeout)
  }
}

async function ensureCategory(name, bySlug, byName, stats) {
  const trimmed = name.trim().slice(0, 100)
  if (!trimmed) return null
  const mapped = CATEGORY_MAP[trimmed] ?? trimmed
  const existing = byName.get(mapped.toLowerCase())
  if (existing) return existing.id

  const slug = slugify(mapped).slice(0, 100)
  const slugHit = bySlug.get(slug)
  if (slugHit) return slugHit.id

  const { data, error } = await admin
    .from('categories')
    .insert({ name: mapped, slug, active: true })
    .select('id, name, slug')
    .single()

  if (error || !data) {
    const { data: retry } = await admin
      .from('categories')
      .select('id, name, slug')
      .eq('slug', slug)
      .maybeSingle()
    if (retry) {
      bySlug.set(retry.slug, retry)
      byName.set(retry.name.toLowerCase(), retry)
      return retry.id
    }
    throw new Error(`Categoria "${mapped}": ${error?.message ?? 'erro'}`)
  }

  bySlug.set(data.slug, data)
  byName.set(data.name.toLowerCase(), data)
  stats.categoriesCreated++
  console.log(`  + categoria: ${data.name}`)
  return data.id
}

async function ensureBrand(name, bySlug, byName, stats) {
  if (!name?.trim()) return null
  let trimmed = decodeEntities(name).trim().slice(0, 120)
  const alias = BRAND_ALIAS[normalizeName(trimmed)]
  if (alias) trimmed = alias

  const existing = byName.get(trimmed.toLowerCase())
  if (existing) return existing.id

  // fuzzy slug match
  const slug = slugify(trimmed).slice(0, 120)
  const slugHit = bySlug.get(slug)
  if (slugHit) return slugHit.id

  const { data, error } = await admin
    .from('brands')
    .insert({ name: trimmed, slug, active: true })
    .select('id, name, slug')
    .single()

  if (error || !data) {
    const { data: retry } = await admin
      .from('brands')
      .select('id, name, slug')
      .eq('slug', slug)
      .maybeSingle()
    if (retry) {
      bySlug.set(retry.slug, retry)
      byName.set(retry.name.toLowerCase(), retry)
      return retry.id
    }
    console.warn(`  ! marca falhou: ${trimmed} — ${error?.message}`)
    return null
  }

  bySlug.set(data.slug, data)
  byName.set(data.name.toLowerCase(), data)
  stats.brandsCreated++
  console.log(`  + marca: ${data.name}`)
  return data.id
}

async function importImage(imageUrl, altText, adminUserId) {
  const raw = await downloadRemoteImage(imageUrl)
  const optimized = await optimizeProductImage(raw)
  const storagePath = `import/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${optimized.extension}`

  const { error: uploadError } = await admin.storage
    .from('product-images')
    .upload(storagePath, optimized.buffer, {
      contentType: optimized.mimeType,
      upsert: false,
    })
  if (uploadError) throw new Error(uploadError.message)

  const { data: urlData } = admin.storage.from('product-images').getPublicUrl(storagePath)
  const filename = imageUrl.split('/').pop()?.split('?')[0] ?? 'import.webp'

  const { data, error } = await admin
    .from('media_assets')
    .insert({
      filename: filename.slice(0, 255),
      storage_path: storagePath,
      bucket: 'product-images',
      public_url: urlData.publicUrl,
      mime_type: optimized.mimeType,
      size_bytes: optimized.size,
      alt_text: altText.slice(0, 255) || null,
      uploaded_by: adminUserId,
    })
    .select('id')
    .single()

  if (error || !data) {
    await admin.storage.from('product-images').remove([storagePath])
    throw new Error(error?.message ?? 'Falha ao registrar mídia')
  }
  return data.id
}

// --- main ---
const text = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '')
const rows = parseCsv(text)
const header = rows[0]
const col = (name) => header.indexOf(name)

const iNome = col('Nome')
const iSku = col('SKU')
const iGtin = col('GTIN, UPC, EAN, or ISBN')
const iTipo = col('Tipo')
const iPub = col('Publicado')
const iPreco = col('Preço')
const iPromo = col('Preço promocional')
const iEstoque = col('Estoque')
const iCats = col('Categorias')
const iImgs = col('Imagens')
const iBrand = col('Brands')
const iDesc = col('Descrição')
const iShort = col('Descrição curta')

const csvProducts = []
for (let i = 1; i < rows.length; i++) {
  const r = rows[i]
  if (!r || r.length < 5) continue
  const name = (r[iNome] || '').trim()
  if (!name) continue
  const tipo = (r[iTipo] || 'simple').trim().toLowerCase()
  if (tipo && tipo !== 'simple') continue
  const publicado = (r[iPub] || '1').trim()
  if (publicado === '0' || publicado.toLowerCase() === 'false') continue

  const price = parsePrice(r[iPromo]) ?? parsePrice(r[iPreco])
  if (!price) continue

  const sku = (r[iSku] || '').trim() || null
  const gtin = normalizeGtin(r[iGtin]) || (sku && /^\d{8,14}$/.test(sku) ? sku : null)

  csvProducts.push({
    name: name.slice(0, 200),
    slug: slugify(name),
    sku,
    gtin,
    price,
    stock: Math.max(0, parseInt(r[iEstoque] || '10', 10) || 10),
    categories: parseCategories(r[iCats] || ''),
    brand: (r[iBrand] || '').trim() || null,
    images: parseImages(r[iImgs] || ''),
    description: (r[iDesc] || '').trim() || null,
    shortDescription: (r[iShort] || '').trim() || null,
    nameNorm: normalizeName(name),
    tokenKey: tokenSetKey(name),
  })
}

const [storeProducts, storeCategories, storeBrands, adminProfile] = await Promise.all([
  fetchAll('products', 'id, name, slug, sku, gtin'),
  fetchAll('categories', 'id, name, slug'),
  fetchAll('brands', 'id, name, slug'),
  admin.from('profiles').select('id').eq('role', 'admin').limit(1).maybeSingle(),
])

const adminUserId = adminProfile.data?.id
if (!adminUserId) {
  console.error('Nenhum admin encontrado em profiles (necessário para uploaded_by)')
  process.exit(1)
}

const byGtin = new Map()
const bySku = new Map()
const byNameNorm = new Map()
const byTokenKey = new Map()
for (const p of storeProducts) {
  const g = normalizeGtin(p.gtin)
  if (g) byGtin.set(g, p)
  if (p.sku) bySku.set(String(p.sku).trim().toLowerCase(), p)
  byNameNorm.set(normalizeName(p.name), p)
  byTokenKey.set(tokenSetKey(p.name), p)
}

const categoryBySlug = new Map(storeCategories.map((c) => [c.slug, c]))
const categoryByName = new Map(storeCategories.map((c) => [c.name.toLowerCase(), c]))
const brandBySlug = new Map(storeBrands.map((b) => [b.slug, b]))
const brandByName = new Map(storeBrands.map((b) => [b.name.toLowerCase(), b]))

const toImport = []
const skipped = []
const seenName = new Set()
const seenGtin = new Set()

for (const p of csvProducts) {
  if (p.gtin && byGtin.has(p.gtin)) {
    skipped.push({ name: p.name, reason: 'gtin_existe' })
    continue
  }
  if (p.sku && bySku.has(p.sku.toLowerCase())) {
    skipped.push({ name: p.name, reason: 'sku_existe' })
    continue
  }
  if (byNameNorm.has(p.nameNorm)) {
    skipped.push({ name: p.name, reason: 'nome_existe' })
    continue
  }
  // mesmo conjunto de tokens (ex.: Redken All Soft)
  if (byTokenKey.has(p.tokenKey)) {
    skipped.push({ name: p.name, reason: 'tokens_iguais', match: byTokenKey.get(p.tokenKey).name })
    continue
  }
  if (seenName.has(p.nameNorm)) {
    skipped.push({ name: p.name, reason: 'dup_csv_nome' })
    continue
  }
  if (p.gtin && seenGtin.has(p.gtin)) {
    skipped.push({ name: p.name, reason: 'dup_csv_gtin' })
    continue
  }

  seenName.add(p.nameNorm)
  if (p.gtin) seenGtin.add(p.gtin)
  toImport.push(p)
}

console.log(`CSV: ${csvProducts.length} | Importar: ${toImport.length} | Pular: ${skipped.length}`)
console.log('Skips:', [...skipped.reduce((m, s) => m.set(s.reason, (m.get(s.reason) || 0) + 1), new Map())])

const stats = {
  created: 0,
  errors: 0,
  imagesImported: 0,
  categoriesCreated: 0,
  brandsCreated: 0,
  imageFailures: 0,
}
const errorLog = []
const outDir = path.join(process.cwd(), 'scripts', 'tmp')
fs.mkdirSync(outDir, { recursive: true })

for (let i = 0; i < toImport.length; i++) {
  const p = toImport[i]
  const n = i + 1
  try {
    process.stdout.write(`[${n}/${toImport.length}] ${p.name.slice(0, 70)}... `)

    const categoryIds = []
    for (const cat of p.categories) {
      const id = await ensureCategory(cat, categoryBySlug, categoryByName, stats)
      if (id && !categoryIds.includes(id)) categoryIds.push(id)
    }

    const brandId = await ensureBrand(p.brand, brandBySlug, brandByName, stats)

    let slug = p.slug
    const { data: slugExists } = await admin.from('products').select('id').eq('slug', slug).maybeSingle()
    if (slugExists) {
      slug = `${p.slug}-${(p.gtin || p.sku || String(Date.now())).toString().slice(-8)}`.slice(0, 200)
    }

    const payload = {
      name: p.name,
      slug,
      description: p.description,
      short_description: p.shortDescription,
      price: p.price,
      original_price: null,
      stock: p.stock,
      sku: p.sku,
      gtin: p.gtin,
      brand_id: brandId,
      active: true,
      updated_at: new Date().toISOString(),
    }

    const { data: created, error } = await admin.from('products').insert(payload).select('id').single()
    if (error || !created) throw new Error(error?.message ?? 'Falha ao criar produto')

    if (categoryIds.length) {
      await admin.from('product_categories').insert(
        categoryIds.map((category_id) => ({ product_id: created.id, category_id }))
      )
    }

    const mediaIds = []
    for (const imageUrl of p.images) {
      try {
        const mediaId = await importImage(imageUrl, p.name, adminUserId)
        mediaIds.push(mediaId)
        stats.imagesImported++
      } catch (e) {
        stats.imageFailures++
        console.warn(`\n    img fail: ${e instanceof Error ? e.message : e}`)
      }
    }

    if (mediaIds.length) {
      await admin.from('product_images').insert(
        mediaIds.map((media_id, index) => ({
          product_id: created.id,
          media_id,
          sort_order: index,
        }))
      )
    }

    // keep skip maps updated for later rows
    byNameNorm.set(p.nameNorm, { id: created.id, name: p.name })
    byTokenKey.set(p.tokenKey, { id: created.id, name: p.name })
    if (p.gtin) byGtin.set(p.gtin, { id: created.id, name: p.name })
    if (p.sku) bySku.set(p.sku.toLowerCase(), { id: created.id, name: p.name })

    stats.created++
    console.log(`OK (+${mediaIds.length} imgs)`)
  } catch (e) {
    stats.errors++
    const message = e instanceof Error ? e.message : String(e)
    errorLog.push({ name: p.name, message })
    console.log(`ERRO: ${message}`)
  }

  if (n % 25 === 0) {
    fs.writeFileSync(
      path.join(outDir, 'import-firme-forte-progress.json'),
      JSON.stringify({ at: n, total: toImport.length, stats, errorLog, skipped }, null, 2)
    )
  }
}

const report = {
  finishedAt: new Date().toISOString(),
  csvTotal: csvProducts.length,
  planned: toImport.length,
  skipped: skipped.length,
  skipReasons: Object.fromEntries(
    [...skipped.reduce((m, s) => m.set(s.reason, (m.get(s.reason) || 0) + 1), new Map())]
  ),
  skippedItems: skipped,
  stats,
  errorLog,
}

fs.writeFileSync(path.join(outDir, 'import-firme-forte-result.json'), JSON.stringify(report, null, 2))
console.log('\n=== RESULTADO ===')
console.log(JSON.stringify({ ...stats, skipped: skipped.length, planned: toImport.length }, null, 2))
if (errorLog.length) {
  console.log('Erros:', errorLog.slice(0, 10))
}
