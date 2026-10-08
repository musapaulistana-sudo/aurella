-- =============================================================================
-- PARTE 12 — Importação WooCommerce (campos de rastreio + índices)
-- Execute ANTES de importar produtos via CSV no admin.
-- Requer PARTE_9_products_media.sql (marcas, mídia, categorias múltiplas, SEO).
-- =============================================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS woocommerce_id BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_woocommerce_id
  ON products (woocommerce_id)
  WHERE woocommerce_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_unique
  ON products (sku)
  WHERE sku IS NOT NULL AND sku <> '';

CREATE INDEX IF NOT EXISTS idx_products_slug ON products (slug);

COMMENT ON COLUMN products.woocommerce_id IS 'ID do produto no WooCommerce (coluna ID do export CSV)';
