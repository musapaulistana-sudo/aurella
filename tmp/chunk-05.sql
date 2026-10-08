
UPDATE products p
SET brand_id = b.id, updated_at = now()
FROM brands b
WHERE b.slug = 'avene'
  AND p.sku IN ('PFB6280172','PFB7538561','PFB7538876');
