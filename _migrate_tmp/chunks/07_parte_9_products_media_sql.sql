-- =============================================================================
-- PARTE 9 — Produtos avançados: marcas, mídia, categorias múltiplas, SEO
-- =============================================================================

CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  storage_path TEXT NOT NULL,
  bucket VARCHAR(64) NOT NULL DEFAULT 'product-images',
  public_url TEXT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INT NOT NULL CHECK (size_bytes > 0),
  alt_text VARCHAR(255),
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_assets_created ON media_assets(created_at DESC);

-- Campos extras em products
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS benefits TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS gtin VARCHAR(14);
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title VARCHAR(70);
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description VARCHAR(160);

CREATE TABLE IF NOT EXISTS product_categories (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_category ON product_categories(category_id);

CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE (product_id, media_id)
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id, sort_order);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brands_public_read" ON brands;
CREATE POLICY "brands_public_read" ON brands FOR SELECT USING (active = true);
DROP POLICY IF EXISTS "brands_admin_all" ON brands;
CREATE POLICY "brands_admin_all" ON brands FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "media_public_read" ON media_assets;
CREATE POLICY "media_public_read" ON media_assets FOR SELECT USING (true);
DROP POLICY IF EXISTS "media_admin_all" ON media_assets;
CREATE POLICY "media_admin_all" ON media_assets FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "product_categories_public_read" ON product_categories;
CREATE POLICY "product_categories_public_read" ON product_categories
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.active = true)
  );
DROP POLICY IF EXISTS "product_categories_admin_all" ON product_categories;
CREATE POLICY "product_categories_admin_all" ON product_categories
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "product_images_public_read" ON product_images;
CREATE POLICY "product_images_public_read" ON product_images
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.active = true)
  );
DROP POLICY IF EXISTS "product_images_admin_all" ON product_images;
CREATE POLICY "product_images_admin_all" ON product_images
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
