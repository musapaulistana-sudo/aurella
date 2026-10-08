import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(url, key)
const payload = JSON.parse(readFileSync('d:/cosmeticospt/tmp/cosmetics-payload.json', 'utf8'))
const keepSkus = payload.products.map((p) => p.sku)
const keepSet = new Set(keepSkus)
const taxSlugs = new Set(payload.taxonomy.map((t) => t.slug))

async function main() {
  // Activate keep SKUs
  for (let i = 0; i < keepSkus.length; i += 80) {
    const chunk = keepSkus.slice(i, i + 80)
    const { error } = await supabase
      .from('products')
      .update({ active: true, updated_at: new Date().toISOString() })
      .in('sku', chunk)
    if (error) console.error('activate', error.message)
  }

  // Deactivate everything else
  const { data: all } = await supabase.from('products').select('id, sku, active')
  const toOff = (all || []).filter((p) => !p.sku || !keepSet.has(p.sku)).map((p) => p.id)
  for (let i = 0; i < toOff.length; i += 80) {
    const chunk = toOff.slice(i, i + 80)
    const { error } = await supabase
      .from('products')
      .update({ active: false, updated_at: new Date().toISOString() })
      .in('id', chunk)
    if (error) console.error('deactivate', error.message)
  }

  // Brands
  const { data: activeBrandRows } = await supabase.from('products').select('brand_id').eq('active', true)
  const usedBrands = new Set((activeBrandRows || []).map((r) => r.brand_id).filter(Boolean))
  const { data: brands } = await supabase.from('brands').select('id')
  for (const b of brands || []) {
    await supabase.from('brands').update({ active: usedBrands.has(b.id) }).eq('id', b.id)
  }

  // Categories: taxonomy always on; others only if used by active products
  const { data: pcs } = await supabase
    .from('product_categories')
    .select('category_id, product:products!inner(id, active)')
    .eq('product.active', true)
  const usedCats = new Set((pcs || []).map((r) => r.category_id))
  const { data: cats } = await supabase.from('categories').select('id, slug')
  for (const c of cats || []) {
    const active = taxSlugs.has(c.slug) || usedCats.has(c.id)
    await supabase.from('categories').update({ active }).eq('id', c.id)
  }

  // Rename taxonomy display names / sort
  for (const t of payload.taxonomy) {
    await supabase
      .from('categories')
      .update({ name: t.name, sort_order: t.sort, active: true })
      .eq('slug', t.slug)
  }

  const { count: activeCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('active', true)
  const { count: inactiveCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('active', false)
  const { count: activeBrands } = await supabase
    .from('brands')
    .select('*', { count: 'exact', head: true })
    .eq('active', true)
  const { count: activeCats } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true })
    .eq('active', true)

  const { data: brandStats } = await supabase
    .from('products')
    .select('brand:brands(name)')
    .eq('active', true)

  const bc = new Map()
  for (const r of brandStats || []) {
    const n = r.brand?.name || '(sem)'
    bc.set(n, (bc.get(n) || 0) + 1)
  }

  console.log({
    activeCount,
    inactiveCount,
    activeBrands,
    activeCats,
    deactivated: toOff.length,
    brands: [...bc.entries()].sort((a, b) => b[1] - a[1]),
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
