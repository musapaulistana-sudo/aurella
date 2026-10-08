
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
