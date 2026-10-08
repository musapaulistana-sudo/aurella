
UPDATE products p
SET brand_id = b.id, updated_at = now()
FROM brands b
WHERE b.slug = 'hartmann'
  AND p.sku IN ('BRA503');
