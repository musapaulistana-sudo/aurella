import { readFileSync, writeFileSync } from 'fs'

const payload = JSON.parse(readFileSync('d:/cosmeticospt/tmp/cosmetics-payload.json', 'utf8'))

function esc(s) {
  return String(s).replace(/'/g, "''")
}

function slugify(b) {
  return (
    b
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'marca'
  )
}

const skus = payload.products.map((p) => p.sku)
const skuSql = skus.map((s) => `'${esc(s)}'`).join(',')

const chunks = []

// brands
chunks.push(
  payload.brands
    .map(
      (b) =>
        `INSERT INTO brands (name, slug, active) VALUES ('${esc(b)}', '${esc(slugify(b))}', true) ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, active=true;`
    )
    .join('\n')
)

// deactivate / activate
chunks.push(`
UPDATE products SET active = false, updated_at = now()
WHERE active = true AND (sku IS NULL OR sku NOT IN (${skuSql}));

UPDATE products SET active = true, updated_at = now()
WHERE sku IN (${skuSql});
`)

// brand assignments
for (const brand of payload.brands) {
  const brandSkus = payload.products.filter((p) => p.brand === brand).map((p) => p.sku)
  if (!brandSkus.length) continue
  const list = brandSkus.map((s) => `'${esc(s)}'`).join(',')
  chunks.push(`
UPDATE products p
SET brand_id = b.id, updated_at = now()
FROM brands b
WHERE b.slug = '${esc(slugify(brand))}'
  AND p.sku IN (${list});
`)
}

// clear category links for keep products
chunks.push(`
DELETE FROM product_categories pc
USING products p
WHERE pc.product_id = p.id AND p.sku IN (${skuSql});
`)

// category assignments
const byCat = new Map()
for (const p of payload.products) {
  for (const c of p.cats) {
    if (!byCat.has(c)) byCat.set(c, [])
    byCat.get(c).push(p.sku)
  }
}

for (const [catSlug, catSkus] of byCat) {
  const list = catSkus.map((s) => `'${esc(s)}'`).join(',')
  chunks.push(`
INSERT INTO product_categories (product_id, category_id)
SELECT p.id, c.id
FROM products p
CROSS JOIN categories c
WHERE c.slug = '${esc(catSlug)}'
  AND p.sku IN (${list})
ON CONFLICT DO NOTHING;
`)
}

// primary category = first cat in payload
const primaryCases = payload.products
  .map((p) => `WHEN p.sku = '${esc(p.sku)}' THEN '${esc(p.cats[0])}'`)
  .join('\n  ')

chunks.push(`
UPDATE products p
SET category_id = c.id, updated_at = now()
FROM categories c
WHERE c.slug = CASE
  ${primaryCases}
END
AND p.sku IN (${skuSql});
`)

// cleanup unused
chunks.push(`
UPDATE categories c
SET active = false
WHERE c.slug NOT IN ('cuidados-com-a-pele','cuidados-do-corpo','protecao-solar','cabelo','higiene-pessoal','maquilhagem','cosmetica')
AND NOT EXISTS (
  SELECT 1 FROM product_categories pc
  JOIN products p ON p.id = pc.product_id AND p.active
  WHERE pc.category_id = c.id
);

UPDATE categories SET active = true
WHERE slug IN ('cuidados-com-a-pele','cuidados-do-corpo','protecao-solar','cabelo','higiene-pessoal','maquilhagem','cosmetica');

-- Cosmética as catch-all only if empty primary use — keep active but may have few products
UPDATE brands b SET active = false
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.brand_id = b.id AND p.active);

UPDATE brands b SET active = true
WHERE EXISTS (SELECT 1 FROM products p WHERE p.brand_id = b.id AND p.active);
`)

chunks.forEach((sql, i) => {
  writeFileSync(`d:/cosmeticospt/tmp/chunk-${String(i).padStart(2, '0')}.sql`, sql)
  console.log(`chunk ${i}`, sql.length)
})
console.log('chunks', chunks.length)
