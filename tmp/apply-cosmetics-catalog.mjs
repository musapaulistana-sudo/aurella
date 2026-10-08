import { readFileSync, writeFileSync } from 'fs'
import { execFileSync } from 'child_process'

// Re-run selection with stricter exclusions, then emit SQL
const keep = JSON.parse(readFileSync('d:/cosmeticospt/tmp/cosmetics-keep.json', 'utf8'))

const DROP_BRANDS = new Set(['colagenius', 'generis', 'id', 'faes farma'])
const DROP_SKU_PREFIX_OR_NAME =
  /bacitracina|penso id|gummies|ampolas|saquetas|carteiras|beauty total|colagenius|fresubin|comprimido|c[aá]psula/i

const products = keep.products.filter((p) => {
  if (DROP_BRANDS.has(p.brand.toLowerCase())) return false
  if (DROP_SKU_PREFIX_OR_NAME.test(`${p.sku} ${p.name}`)) return false
  // drop saúde oral from this pass — focus on cosméticos/dermocosmética
  const onlyOral =
    p.categories.length === 1 && p.categories[0].slug === 'saude-oral'
  if (onlyOral) return false
  p.categories = p.categories.filter((c) => c.slug !== 'saude-oral')
  if (p.categories.length === 0) {
    p.categories = [{ slug: 'cosmetica', name: 'Cosmética' }]
  }
  return true
})

// Cap 400 preferring premium dermocosmetic brands
const PREMIUM =
  /la roche|eucerin|cerave|svr|vichy|av[eè]ne|lazartigue|essence|barral|atl|noreva|segle|bepanthene|bayer/i
products.sort((a, b) => {
  const ap = PREMIUM.test(a.brand) || PREMIUM.test(a.name) ? 1 : 0
  const bp = PREMIUM.test(b.brand) || PREMIUM.test(b.name) ? 1 : 0
  return bp - ap || a.name.localeCompare(b.name, 'pt')
})
const finalProducts = products.slice(0, 400)

const brandNames = [...new Set(finalProducts.map((p) => p.brand))].sort()
const taxonomy = [
  { slug: 'cuidados-com-a-pele', name: 'Cuidados com a Pele', sort: 10 },
  { slug: 'cuidados-do-corpo', name: 'Cuidados do Corpo', sort: 20 },
  { slug: 'protecao-solar', name: 'Proteção Solar', sort: 30 },
  { slug: 'cabelo', name: 'Cabelo', sort: 40 },
  { slug: 'higiene-pessoal', name: 'Higiene Pessoal', sort: 50 },
  { slug: 'maquilhagem', name: 'Maquilhagem', sort: 60 },
  { slug: 'cosmetica', name: 'Cosmética', sort: 70 },
]

const brandCounts = new Map()
const catCounts = new Map()
for (const p of finalProducts) {
  brandCounts.set(p.brand, (brandCounts.get(p.brand) || 0) + 1)
  for (const c of p.categories) catCounts.set(c.name, (catCounts.get(c.name) || 0) + 1)
}

console.log('final', finalProducts.length)
console.log('brands', [...brandCounts.entries()].sort((a, b) => b[1] - a[1]))
console.log('cats', [...catCounts.entries()].sort((a, b) => b[1] - a[1]))

function esc(s) {
  return String(s).replace(/'/g, "''")
}

const skus = finalProducts.map((p) => p.sku)
const skuArraySql = skus.map((s) => `'${esc(s)}'`).join(',')

// Assignment values as JSON for a temp approach
const assignments = finalProducts.map((p) => ({
  sku: p.sku,
  brand: p.brand,
  categories: p.categories.map((c) => c.slug),
}))

writeFileSync(
  'd:/cosmeticospt/tmp/cosmetics-final.json',
  JSON.stringify({ products: finalProducts, taxonomy, brandNames, assignments }, null, 2)
)

// Build SQL in chunks
const sqlParts = []

sqlParts.push(`
-- 1) Ensure taxonomy categories exist (PT-PT)
INSERT INTO categories (name, slug, sort_order, active)
VALUES
  ('Cuidados com a Pele', 'cuidados-com-a-pele', 10, true),
  ('Cuidados do Corpo', 'cuidados-do-corpo', 20, true),
  ('Proteção Solar', 'protecao-solar', 30, true),
  ('Cabelo', 'cabelo', 40, true),
  ('Higiene Pessoal', 'higiene-pessoal', 50, true),
  ('Maquilhagem', 'maquilhagem', 60, true),
  ('Cosmética', 'cosmetica', 70, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order,
  active = true;
`)

sqlParts.push(`
-- 2) Ensure brands exist
${brandNames
  .map((b) => {
    const slug = b
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    return `INSERT INTO brands (name, slug, active)
VALUES ('${esc(b)}', '${esc(slug || 'marca')}', true)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, active = true;`
  })
  .join('\n')}
`)

sqlParts.push(`
-- 3) Deactivate products not in keep list (by SKU when present)
UPDATE products
SET active = false, updated_at = now()
WHERE active = true
  AND (
    sku IS NULL
    OR sku NOT IN (${skuArraySql})
  );
`)

sqlParts.push(`
-- 4) Activate keep list
UPDATE products
SET active = true, updated_at = now()
WHERE sku IN (${skuArraySql});
`)

writeFileSync('d:/cosmeticospt/tmp/cosmetics-step1-deactivate.sql', sqlParts.join('\n'))

// assignment SQL via temp table
const assignSql = []
assignSql.push(`
CREATE TEMP TABLE IF NOT EXISTS _keep_cosmetics (
  sku text PRIMARY KEY,
  brand_name text NOT NULL,
  category_slugs text[] NOT NULL
);
TRUNCATE _keep_cosmetics;
`)

const valueRows = assignments.map(
  (a) =>
    `('${esc(a.sku)}', '${esc(a.brand)}', ARRAY[${a.categories.map((s) => `'${esc(s)}'`).join(',')}]::text[])`
)

// chunk inserts
const chunkSize = 50
for (let i = 0; i < valueRows.length; i += chunkSize) {
  const chunk = valueRows.slice(i, i + chunkSize)
  assignSql.push(
    `INSERT INTO _keep_cosmetics (sku, brand_name, category_slugs) VALUES\n${chunk.join(',\n')}\nON CONFLICT (sku) DO UPDATE SET brand_name = EXCLUDED.brand_name, category_slugs = EXCLUDED.category_slugs;`
  )
}

assignSql.push(`
-- Link brands
UPDATE products p
SET brand_id = b.id, updated_at = now()
FROM _keep_cosmetics k
JOIN brands b ON lower(b.name) = lower(k.brand_name) OR b.slug = regexp_replace(lower(unaccent(k.brand_name)), '[^a-z0-9]+', '-', 'g')
WHERE p.sku = k.sku;

-- Clear old category links for keep products
DELETE FROM product_categories pc
USING products p, _keep_cosmetics k
WHERE pc.product_id = p.id AND p.sku = k.sku;

-- Insert new category links
INSERT INTO product_categories (product_id, category_id)
SELECT p.id, c.id
FROM _keep_cosmetics k
JOIN products p ON p.sku = k.sku
JOIN LATERAL unnest(k.category_slugs) AS slug ON true
JOIN categories c ON c.slug = slug
ON CONFLICT DO NOTHING;

-- Primary category_id = first mapped category
UPDATE products p
SET category_id = c.id, updated_at = now()
FROM _keep_cosmetics k
JOIN categories c ON c.slug = k.category_slugs[1]
WHERE p.sku = k.sku;

-- Deactivate unused categories (no active products)
UPDATE categories c
SET active = false
WHERE NOT EXISTS (
  SELECT 1
  FROM product_categories pc
  JOIN products p ON p.id = pc.product_id AND p.active = true
  WHERE pc.category_id = c.id
)
AND c.slug NOT IN (${taxonomy.map((t) => `'${t.slug}'`).join(',')});

-- Keep taxonomy cats active even if empty briefly
UPDATE categories SET active = true WHERE slug IN (${taxonomy.map((t) => `'${t.slug}'`).join(',')});

-- Deactivate unused brands
UPDATE brands b
SET active = false
WHERE NOT EXISTS (
  SELECT 1 FROM products p WHERE p.brand_id = b.id AND p.active = true
);

-- Re-activate used brands
UPDATE brands b
SET active = true
WHERE EXISTS (
  SELECT 1 FROM products p WHERE p.brand_id = b.id AND p.active = true
);
`)

writeFileSync('d:/cosmeticospt/tmp/cosmetics-step2-assign.sql', assignSql.join('\n'))
console.log('wrote SQL files')
console.log('skus', skus.length)
