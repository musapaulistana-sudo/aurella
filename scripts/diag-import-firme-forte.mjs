/**
 * Diagnóstico de importação — CSV WooCommerce (PT-BR) vs loja atual.
 * Uso: node --env-file=.env.local scripts/diag-import-firme-forte.mjs <csvPath>
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

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

function normalizeGtin(s) {
  if (!s) return null
  const d = String(s).replace(/\D/g, '')
  return d.length >= 8 ? d : null
}

function tokenize(s) {
  return normalizeName(s)
    .split(' ')
    .filter((t) => t.length > 1)
}

function jaccard(a, b) {
  const A = new Set(tokenize(a))
  const B = new Set(tokenize(b))
  if (!A.size || !B.size) return 0
  let inter = 0
  for (const t of A) if (B.has(t)) inter++
  return inter / (A.size + B.size - inter)
}

function parsePrice(v) {
  const n = parseFloat(String(v).replace(',', '.').trim())
  if (Number.isNaN(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

function parseImages(raw) {
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//i.test(u))
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
    const { data, error } = await admin
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    all.push(...(data ?? []))
    if (!data || data.length < pageSize) break
    from += pageSize
  }
  return all
}

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
  const gtin = normalizeGtin(r[iGtin]) || normalizeGtin(sku)
  const categories = parseCategories(r[iCats] || '')
  const images = parseImages(r[iImgs] || '')
  const brand = (r[iBrand] || '').trim() || null

  csvProducts.push({
    row: i + 1,
    name: name.slice(0, 200),
    slug: slugify(name),
    sku,
    gtin,
    price,
    originalPrice: null,
    stock: Math.max(0, parseInt(r[iEstoque] || '10', 10) || 10),
    categories,
    brand,
    images,
    description: (r[iDesc] || '').trim() || null,
    shortDescription: (r[iShort] || '').trim() || null,
    nameNorm: normalizeName(name),
  })
}

const [storeProducts, storeCategories, storeBrands] = await Promise.all([
  fetchAll('products', 'id, name, slug, sku, gtin, price, brand_id, active'),
  fetchAll('categories', 'id, name, slug, active'),
  fetchAll('brands', 'id, name, slug, active'),
])

const byGtin = new Map()
const bySku = new Map()
const byNameNorm = new Map()
for (const p of storeProducts) {
  const g = normalizeGtin(p.gtin)
  if (g) byGtin.set(g, p)
  if (p.sku) bySku.set(String(p.sku).trim().toLowerCase(), p)
  byNameNorm.set(normalizeName(p.name), p)
}

const duplicates = []
const possibleDuplicates = []
const toImport = []
const seenCsvGtin = new Map()
const seenCsvName = new Map()
const csvInternalDups = []

for (const p of csvProducts) {
  // internal CSV dups
  if (p.gtin) {
    if (seenCsvGtin.has(p.gtin)) {
      csvInternalDups.push({
        reason: 'gtin_interno',
        product: p.name,
        gtin: p.gtin,
        other: seenCsvGtin.get(p.gtin),
      })
    } else seenCsvGtin.set(p.gtin, p.name)
  }
  if (seenCsvName.has(p.nameNorm)) {
    csvInternalDups.push({
      reason: 'nome_interno',
      product: p.name,
      other: seenCsvName.get(p.nameNorm),
    })
  } else seenCsvName.set(p.nameNorm, p.name)

  let match = null
  let matchReason = null

  if (p.gtin && byGtin.has(p.gtin)) {
    match = byGtin.get(p.gtin)
    matchReason = 'gtin'
  } else if (p.sku && bySku.has(p.sku.toLowerCase())) {
    match = bySku.get(p.sku.toLowerCase())
    matchReason = 'sku'
  } else if (byNameNorm.has(p.nameNorm)) {
    match = byNameNorm.get(p.nameNorm)
    matchReason = 'nome_exato'
  }

  if (match) {
    duplicates.push({
      csvName: p.name,
      csvGtin: p.gtin,
      csvSku: p.sku,
      csvPrice: p.price,
      storeName: match.name,
      storeGtin: match.gtin,
      storeSku: match.sku,
      storePrice: match.price,
      reason: matchReason,
    })
    continue
  }

  // fuzzy name against store
  let best = null
  let bestScore = 0
  for (const sp of storeProducts) {
    const score = jaccard(p.name, sp.name)
    if (score > bestScore) {
      bestScore = score
      best = sp
    }
  }
  if (best && bestScore >= 0.72) {
    possibleDuplicates.push({
      csvName: p.name,
      csvGtin: p.gtin,
      csvPrice: p.price,
      storeName: best.name,
      storeGtin: best.gtin,
      storePrice: best.price,
      similarity: Math.round(bestScore * 100),
    })
    // treat strong fuzzy as skip candidate for safety in report;
    // user decides — for import plan we put in "review" not auto-import
    continue
  }

  toImport.push(p)
}

// Categories analysis
const csvCats = new Map()
for (const p of csvProducts) {
  for (const c of p.categories) {
    csvCats.set(c, (csvCats.get(c) || 0) + 1)
  }
}

function findSimilarLabel(name, existingNames) {
  const hits = []
  const n = normalizeName(name)
  const nSlug = slugify(name)
  for (const ex of existingNames) {
    const en = normalizeName(ex)
    const es = slugify(ex)
    if (n === en || nSlug === es) {
      hits.push({ existing: ex, kind: 'exato' })
      continue
    }
    // substring / near
    if (n.includes(en) || en.includes(n)) {
      hits.push({ existing: ex, kind: 'contém' })
      continue
    }
    const score = jaccard(name, ex)
    if (score >= 0.5) hits.push({ existing: ex, kind: `similar_${Math.round(score * 100)}` })
  }
  return hits
}

const categoryPlan = []
for (const [cat, count] of [...csvCats.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const hits = findSimilarLabel(
    cat,
    storeCategories.map((c) => c.name)
  )
  const exact = hits.find((h) => h.kind === 'exato')
  categoryPlan.push({
    csvCategory: cat,
    productCount: count,
    action: exact ? 'reusar' : hits.length ? 'revisar' : 'criar',
    match: exact?.existing ?? hits[0]?.existing ?? null,
    matchKind: exact?.kind ?? hits[0]?.kind ?? null,
    alternatives: hits.filter((h) => h.kind !== 'exato').map((h) => `${h.existing} (${h.kind})`),
  })
}

const csvBrands = new Map()
for (const p of csvProducts) {
  if (!p.brand) continue
  csvBrands.set(p.brand, (csvBrands.get(p.brand) || 0) + 1)
}

const brandPlan = []
for (const [brand, count] of [...csvBrands.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const hits = findSimilarLabel(
    brand,
    storeBrands.map((b) => b.name)
  )
  // special known aliases
  const aliases = {
    "l'oréal paris": "l'oréal",
    'loreal paris': "l'oréal",
    "l'oreal paris": "l'oréal",
    avène: 'avêne',
    avene: 'avêne',
    skinceuticals: 'skinceuticals',
    isdin: 'isdin',
    cerave: 'cerave',
    'm.a.c': 'mac',
    mac: 'mac',
  }
  const aliasTarget = aliases[normalizeName(brand)]
  let forced = null
  if (aliasTarget) {
    forced = storeBrands.find((b) => normalizeName(b.name) === aliasTarget || slugify(b.name) === slugify(aliasTarget))
  }

  const exact = hits.find((h) => h.kind === 'exato')
  const match = forced ?? (exact ? { name: exact.existing } : hits[0] ? { name: hits[0].existing } : null)
  brandPlan.push({
    csvBrand: brand,
    productCount: count,
    action: forced || exact ? 'reusar' : hits.length ? 'revisar' : 'criar',
    match: match?.name ?? null,
    matchKind: forced ? 'alias' : exact?.kind ?? hits[0]?.kind ?? null,
    alternatives: hits.filter((h) => h.kind !== 'exato').map((h) => `${h.existing} (${h.kind})`),
  })
}

// Suggested category mapping for known overlaps
const suggestedCategoryMap = {
  'Cuidado Facial': 'Cuidados com a Pele',
  'Suplementos e Vitaminas': 'Beleza e Saúde',
  'Proteção Solar': 'Proteção Solar',
}

for (const plan of categoryPlan) {
  if (suggestedCategoryMap[plan.csvCategory]) {
    const target = suggestedCategoryMap[plan.csvCategory]
    const exists = storeCategories.some((c) => c.name === target)
    if (exists && plan.action !== 'reusar') {
      plan.action = 'mapear'
      plan.match = target
      plan.matchKind = 'sugestão'
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  csvFile: path.basename(csvPath),
  store: {
    products: storeProducts.length,
    categories: storeCategories.map((c) => c.name).sort(),
    brands: storeBrands.map((b) => b.name).sort(),
  },
  csv: {
    totalRows: csvProducts.length,
    withGtin: csvProducts.filter((p) => p.gtin).length,
    withoutGtin: csvProducts.filter((p) => !p.gtin).length,
    withBrand: csvProducts.filter((p) => p.brand).length,
    withoutBrand: csvProducts.filter((p) => !p.brand).length,
    withImages: csvProducts.filter((p) => p.images.length).length,
    categories: [...csvCats.keys()].sort(),
    brands: [...csvBrands.keys()].sort(),
  },
  summary: {
    duplicatesExact: duplicates.length,
    possibleDuplicatesFuzzy: possibleDuplicates.length,
    toImport: toImport.length,
    csvInternalDups: csvInternalDups.length,
    categoriesToCreate: categoryPlan.filter((c) => c.action === 'criar').length,
    categoriesToReuse: categoryPlan.filter((c) => c.action === 'reusar').length,
    categoriesToReview: categoryPlan.filter((c) => c.action === 'revisar' || c.action === 'mapear').length,
    brandsToCreate: brandPlan.filter((b) => b.action === 'criar').length,
    brandsToReuse: brandPlan.filter((b) => b.action === 'reusar').length,
    brandsToReview: brandPlan.filter((b) => b.action === 'revisar').length,
  },
  duplicates,
  possibleDuplicates: possibleDuplicates.sort((a, b) => b.similarity - a.similarity),
  csvInternalDups,
  categoryPlan,
  brandPlan,
  toImportPreview: toImport.slice(0, 80).map((p) => ({
    name: p.name,
    gtin: p.gtin,
    sku: p.sku,
    price: p.price,
    brand: p.brand,
    categories: p.categories,
    images: p.images.length,
  })),
  toImportAllNames: toImport.map((p) => p.name),
}

const outDir = path.join(process.cwd(), 'scripts', 'tmp')
fs.mkdirSync(outDir, { recursive: true })
const outPath = path.join(outDir, 'import-diag-firme-forte.json')
fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8')

console.log(JSON.stringify(report.summary, null, 2))
console.log('\nCSV total:', report.csv.totalRows)
console.log('Store products:', report.store.products)
console.log('Categories CSV:', report.csv.categories.join(' | '))
console.log('Store categories:', report.store.categories.join(' | '))
console.log('\nCategory plan:')
for (const c of report.categoryPlan) {
  console.log(`  [${c.action}] ${c.csvCategory} (${c.productCount}) → ${c.match ?? 'NOVA'} ${c.matchKind ? '(' + c.matchKind + ')' : ''}`)
}
console.log('\nBrand plan (criar/revisar):')
for (const b of report.brandPlan.filter((x) => x.action !== 'reusar')) {
  console.log(`  [${b.action}] ${b.csvBrand} (${b.productCount}) → ${b.match ?? 'NOVA'} ${b.matchKind ?? ''}`)
}
console.log('\nDuplicates exact sample:')
for (const d of report.duplicates.slice(0, 15)) {
  console.log(`  [${d.reason}] CSV: ${d.csvName} ↔ Loja: ${d.storeName}`)
}
console.log('\nFuzzy possibles:')
for (const d of report.possibleDuplicates.slice(0, 20)) {
  console.log(`  ${d.similarity}% CSV: ${d.csvName} ↔ Loja: ${d.storeName}`)
}
console.log('\nReport saved:', outPath)
