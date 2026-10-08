
UPDATE products p
SET brand_id = b.id, updated_at = now()
FROM brands b
WHERE b.slug = 'bayer'
  AND p.sku IN ('BAY8677104','BAY6412536','BAY8445205');
