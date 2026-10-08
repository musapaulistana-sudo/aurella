
UPDATE products p
SET brand_id = b.id, updated_at = now()
FROM brands b
WHERE b.slug = 'barral'
  AND p.sku IN ('BAR6565192','BAR7078931','BAR7078949','BAR7612457','BAR7297309');
