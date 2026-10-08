
UPDATE products p
SET brand_id = b.id, updated_at = now()
FROM brands b
WHERE b.slug = 'atl'
  AND p.sku IN ('EDO4748','EDO7775957','EDO7575209','EDO4743','EDO015','EDO4747');
