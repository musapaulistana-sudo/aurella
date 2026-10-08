/**
 * Backup de produtos ativos — Loja de Cosméticos
 * Uso: node --env-file=.env.local scripts/backup-active-products.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const EXPECTED_REF = 'kktzfayiojgsgqdvdazd'
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

console.log(`Conectado ao Supabase: ${ref}`)

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const SELECT = `
  id, name, slug, description, short_description, benefits,
  price, original_price, stock, sku, gtin,
  meta_title, meta_description, google_product_category,
  brand_id, category_id, woocommerce_id, active,
  created_at, updated_at,
  brand:brands(id, name, slug, active),
  product_categories(category_id, categories(id, name, slug)),
  product_images(id, sort_order, media:media_assets(id, public_url, alt_text, filename))
`

const pageSize = 200
let from = 0
/** @type {unknown[]} */
const products = []

while (true) {
  const to = from + pageSize - 1
  const { data, error } = await admin
    .from('products')
    .select(SELECT)
    .eq('active', true)
    .order('created_at', { ascending: true })
    .range(from, to)

  if (error) {
    console.error('Erro ao buscar produtos:', error.message)
    process.exit(1)
  }

  const rows = data ?? []
  products.push(...rows)
  console.log(`  página ${from}-${to}: ${rows.length} produtos (total ${products.length})`)

  if (rows.length < pageSize) break
  from += pageSize
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const outDir = path.resolve('backups')
fs.mkdirSync(outDir, { recursive: true })

const payload = {
  meta: {
    project_ref: EXPECTED_REF,
    project_url: url,
    exported_at: new Date().toISOString(),
    filter: 'active = true',
    count: products.length,
  },
  products,
}

const jsonPath = path.join(outDir, `produtos-ativos_${stamp}.json`)
fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8')

// CSV resumido (campos principais) para leitura rápida
const csvEscape = (value) => {
  const str = value == null ? '' : String(value)
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

const csvHeader = [
  'id',
  'name',
  'slug',
  'sku',
  'gtin',
  'price',
  'original_price',
  'stock',
  'brand',
  'categories',
  'image_url',
  'active',
  'created_at',
  'updated_at',
]

const csvLines = [csvHeader.join(',')]
for (const row of products) {
  const p = /** @type {Record<string, any>} */ (row)
  const brand = p.brand?.name ?? ''
  const categories = Array.isArray(p.product_categories)
    ? p.product_categories
        .map((pc) => pc?.categories?.name)
        .filter(Boolean)
        .join(' | ')
    : ''
  const images = Array.isArray(p.product_images)
    ? [...p.product_images].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
    : []
  const imageUrl = images[0]?.media?.public_url ?? ''

  csvLines.push(
    [
      p.id,
      p.name,
      p.slug,
      p.sku,
      p.gtin,
      p.price,
      p.original_price,
      p.stock,
      brand,
      categories,
      imageUrl,
      p.active,
      p.created_at,
      p.updated_at,
    ]
      .map(csvEscape)
      .join(',')
  )
}

const csvPath = path.join(outDir, `produtos-ativos_${stamp}.csv`)
fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8')

console.log(`\nBackup concluído: ${products.length} produtos ativos`)
console.log(`JSON: ${jsonPath}`)
console.log(`CSV:  ${csvPath}`)
