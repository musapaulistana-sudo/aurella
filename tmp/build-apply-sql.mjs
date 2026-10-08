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

const brandsSql = payload.brands
  .map(
    (b) =>
      `INSERT INTO brands (name, slug, active) VALUES ('${esc(b)}', '${esc(slugify(b))}', true) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, active = true;`
  )
  .join('\n')

writeFileSync('d:/cosmeticospt/tmp/sql-brands.sql', brandsSql)

// Full apply SQL using jsonb payload embedded (nested dollar-quote)
const json = JSON.stringify(payload)

const applySql = `
DO $$
DECLARE
  payload jsonb := $json$${json}$json$::jsonb;
  prod jsonb;
  brand_name text;
  brand_slug text;
  brand_uuid uuid;
  cat_slug text;
  cat_uuid uuid;
  prod_uuid uuid;
  keep_skus text[];
  first_cat text;
BEGIN
  -- collect keep skus
  SELECT array_agg(p->>'sku') INTO keep_skus
  FROM jsonb_array_elements(payload->'products') p;

  -- upsert brands
  FOR brand_name IN SELECT DISTINCT p->>'brand' FROM jsonb_array_elements(payload->'products') p
  LOOP
    brand_slug := regexp_replace(
      lower(translate(brand_name, 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ', 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn')),
      '[^a-z0-9]+', '-', 'g'
    );
    brand_slug := trim(both '-' from brand_slug);
    IF brand_slug = '' THEN brand_slug := 'marca'; END IF;

    INSERT INTO brands (name, slug, active)
    VALUES (brand_name, brand_slug, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, active = true;
  END LOOP;

  -- deactivate products not in keep list
  UPDATE products
  SET active = false, updated_at = now()
  WHERE active = true
    AND (sku IS NULL OR NOT (sku = ANY (keep_skus)));

  -- activate keep products that exist
  UPDATE products
  SET active = true, updated_at = now()
  WHERE sku = ANY (keep_skus);

  -- assign brand + categories
  FOR prod IN SELECT * FROM jsonb_array_elements(payload->'products')
  LOOP
    SELECT id INTO prod_uuid FROM products WHERE sku = prod->>'sku';
    IF prod_uuid IS NULL THEN
      CONTINUE;
    END IF;

    brand_name := prod->>'brand';
    SELECT id INTO brand_uuid FROM brands WHERE lower(name) = lower(brand_name) LIMIT 1;
    IF brand_uuid IS NOT NULL THEN
      UPDATE products SET brand_id = brand_uuid, updated_at = now() WHERE id = prod_uuid;
    END IF;

    DELETE FROM product_categories WHERE product_id = prod_uuid;

    first_cat := NULL;
    FOR cat_slug IN SELECT jsonb_array_elements_text(prod->'cats')
    LOOP
      SELECT id INTO cat_uuid FROM categories WHERE slug = cat_slug LIMIT 1;
      IF cat_uuid IS NOT NULL THEN
        INSERT INTO product_categories (product_id, category_id)
        VALUES (prod_uuid, cat_uuid)
        ON CONFLICT DO NOTHING;
        IF first_cat IS NULL THEN
          first_cat := cat_slug;
          UPDATE products SET category_id = cat_uuid, updated_at = now() WHERE id = prod_uuid;
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  -- deactivate unused categories (except taxonomy)
  UPDATE categories c
  SET active = false
  WHERE c.slug NOT IN (
    'cuidados-com-a-pele','cuidados-do-corpo','protecao-solar','cabelo','higiene-pessoal','maquilhagem','cosmetica'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM product_categories pc
    JOIN products p ON p.id = pc.product_id AND p.active = true
    WHERE pc.category_id = c.id
  );

  -- ensure taxonomy active
  UPDATE categories
  SET active = true
  WHERE slug IN (
    'cuidados-com-a-pele','cuidados-do-corpo','protecao-solar','cabelo','higiene-pessoal','maquilhagem','cosmetica'
  );

  -- deactivate unused brands
  UPDATE brands b
  SET active = false
  WHERE NOT EXISTS (
    SELECT 1 FROM products p WHERE p.brand_id = b.id AND p.active = true
  );

  UPDATE brands b
  SET active = true
  WHERE EXISTS (
    SELECT 1 FROM products p WHERE p.brand_id = b.id AND p.active = true
  );
END $$;
`

writeFileSync('d:/cosmeticospt/tmp/sql-apply-cosmetics.sql', applySql)
console.log('apply sql bytes', Buffer.byteLength(applySql))
