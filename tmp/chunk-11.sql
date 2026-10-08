
UPDATE products p
SET brand_id = b.id, updated_at = now()
FROM brands b
WHERE b.slug = 'noreva'
  AND p.sku IN ('NOR6891127');
