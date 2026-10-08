-- Categoria do Google Shopping por produto (override manual do mapeamento automático)
-- Aceita ID numérico (ex.: "2271") OU caminho completo (ex.: "Saúde e beleza > Cuidados pessoais > Cosméticos")
ALTER TABLE products ADD COLUMN IF NOT EXISTS google_product_category VARCHAR(255);

COMMENT ON COLUMN products.google_product_category IS
  'Categoria de produto do Google Shopping (taxonomy-with-ids). ID ou caminho completo. Se vazio, o feed usa um mapeamento automático pela categoria da loja.';
