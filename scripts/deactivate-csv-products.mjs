/**
 * Desativa produtos da loja que estão neste CSV WooCommerce (PT-BR).
 * Apenas matches exatos (GTIN / SKU / nome normalizado / slug). Sem fuzzy.
 *
 * Uso:
 *   node --env-file=.env.local scripts/deactivate-csv-products.mjs [--apply] [csvPath]
 *
 * Sem --apply: só relatório (dry-run).
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const EXPECTED_REF = 'kktzfayiojgsgqdvdazd'
const DEFAULT_CSV =
  'c:/importarprodutos/exportados/firme_forte_novos_vs_atlas_20260806_140803_woocommerce.csv'

const apply = process.argv.includes('--apply')
const csvPath =
  process.argv.find((arg) => arg.endsWith('.csv'))?.trim() || DEFAULT_CSV

const url = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
if (!url || !serviceKey) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local')
  process.exit(1)
}

const ref = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
if (ref !== EXPECTED_REF) {
  console.error(`Projeto errado. Esperado ${EXPECTED_REF}, obtido ${ref ?? url}`)
  process.exit(1)
}

console.log(`Projeto: ${ref}`)
console.log(`CSV: ${csvPath}`)
console.log(`Modo: ${apply ? 'APPLY (vai desativar)' : 'DRY-RUN (só relatório)'}`)

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
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

async function fetchAllProducts() {
  const pageSize = 1000
  let from = 0
  const all = []
  for (;;) {
    const { data, error } = await admin
      .from('products')
      .select('id, name, slug, sku, gtin, active')
      .range(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
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

if (iNome < 0) {
  console.error('CSV sem coluna Nome')
  process.exit(1)
}

const csvProducts = []
const seenKeys = new Set()

for (let i = 1; i < rows.length; i++) {
  const r = rows[i]
  if (!r || r.length < 3) continue
  const name = (r[iNome] || '').trim()
  if (!name) continue

  const tipo = (r[iTipo] || 'simple').trim().toLowerCase()
  if (tipo && tipo !== 'simple') continue

  const sku = (r[iSku] || '').trim() || null
  const gtin = normalizeGtin(r[iGtin]) || normalizeGtin(sku)
  const key = `${gtin ?? ''}|${(sku ?? '').toLowerCase()}|${normalizeName(name)}`
  if (seenKeys.has(key)) continue
  seenKeys.add(key)

  csvProducts.push({
    row: i + 1,
    name,
    slug: slugify(name),
    sku,
    gtin,
    nameNorm: normalizeName(name),
  })
}

const storeProducts = await fetchAllProducts()
const byGtin = new Map()
const bySku = new Map()
const byNameNorm = new Map()
const bySlug = new Map()

for (const p of storeProducts) {
  const g = normalizeGtin(p.gtin)
  if (g) byGtin.set(g, p)
  if (p.sku) bySku.set(String(p.sku).trim().toLowerCase(), p)
  byNameNorm.set(normalizeName(p.name), p)
  if (p.slug) bySlug.set(String(p.slug).toLowerCase(), p)
}

/** @type {Map<string, { id: string, name: string, sku: string|null, gtin: string|null, active: boolean, reason: string, csvName: string }>} */
const toDeactivate = new Map()
const alreadyInactive = []
const unmatched = []

for (const csv of csvProducts) {
  let match = null
  let reason = null

  if (csv.gtin && byGtin.has(csv.gtin)) {
    match = byGtin.get(csv.gtin)
    reason = 'gtin'
  } else if (csv.sku && bySku.has(csv.sku.toLowerCase())) {
    match = bySku.get(csv.sku.toLowerCase())
    reason = 'sku'
  } else if (byNameNorm.has(csv.nameNorm)) {
    match = byNameNorm.get(csv.nameNorm)
    reason = 'nome'
  } else if (bySlug.has(csv.slug)) {
    match = bySlug.get(csv.slug)
    reason = 'slug'
  }

  if (!match) {
    unmatched.push(csv)
    continue
  }

  if (!match.active) {
    alreadyInactive.push({
      id: match.id,
      name: match.name,
      reason,
      csvName: csv.name,
    })
    continue
  }

  if (!toDeactivate.has(match.id)) {
    toDeactivate.set(match.id, {
      id: match.id,
      name: match.name,
      sku: match.sku,
      gtin: match.gtin,
      active: match.active,
      reason,
      csvName: csv.name,
    })
  }
}

const targets = [...toDeactivate.values()]

console.log('\n=== Resumo ===')
console.log(`CSV (simple únicos): ${csvProducts.length}`)
console.log(`Loja (total): ${storeProducts.length}`)
console.log(`Loja ativos: ${storeProducts.filter((p) => p.active).length}`)
console.log(`Match já inativos: ${alreadyInactive.length}`)
console.log(`Para desativar (ativos + no CSV): ${targets.length}`)
console.log(`CSV sem match na loja: ${unmatched.length}`)

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const outDir = path.resolve('backups')
fs.mkdirSync(outDir, { recursive: true })
const reportPath = path.join(outDir, `deactivate-csv-report_${stamp}.json`)
fs.writeFileSync(
  reportPath,
  JSON.stringify(
    {
      meta: {
        project_ref: EXPECTED_REF,
        csv: csvPath,
        mode: apply ? 'apply' : 'dry-run',
        exported_at: new Date().toISOString(),
      },
      counts: {
        csvProducts: csvProducts.length,
        storeProducts: storeProducts.length,
        toDeactivate: targets.length,
        alreadyInactive: alreadyInactive.length,
        unmatched: unmatched.length,
      },
      toDeactivate: targets,
      alreadyInactive: alreadyInactive.slice(0, 200),
      unmatched: unmatched.slice(0, 200),
    },
    null,
    2
  ),
  'utf8'
)
console.log(`Relatório: ${reportPath}`)

if (targets.length === 0) {
  console.log('\nNada a desativar.')
  process.exit(0)
}

console.log('\nAmostra (até 15):')
for (const item of targets.slice(0, 15)) {
  console.log(`  [${item.reason}] ${item.name} (${item.id})`)
}

if (!apply) {
  console.log('\nDry-run ok. Rode de novo com --apply para desativar.')
  process.exit(0)
}

const ids = targets.map((t) => t.id)
const chunkSize = 100
let updated = 0

for (let i = 0; i < ids.length; i += chunkSize) {
  const chunk = ids.slice(i, i + chunkSize)
  const { data, error } = await admin
    .from('products')
    .update({ active: false, updated_at: new Date().toISOString() })
    .in('id', chunk)
    .eq('active', true)
    .select('id')

  if (error) {
    console.error('Erro ao desativar:', error.message)
    process.exit(1)
  }
  updated += data?.length ?? 0
}

// Segurança: confirmar que só esses IDs ficaram inativos nessa operação
const { count: stillActiveInTarget } = await admin
  .from('products')
  .select('id', { count: 'exact', head: true })
  .in('id', ids)
  .eq('active', true)

const { count: activeTotal } = await admin
  .from('products')
  .select('id', { count: 'exact', head: true })
  .eq('active', true)

console.log(`\nDesativados agora: ${updated}`)
console.log(`Ainda ativos entre os alvos: ${stillActiveInTarget ?? 0}`)
console.log(`Total ativos na loja agora: ${activeTotal ?? '?'}`)
console.log(
  'Feed/sitemap/páginas já filtram active=true — produtos inativos somem do catálogo público.'
)
