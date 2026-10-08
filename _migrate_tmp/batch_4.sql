-- FILE 118_mig_202507111500_google_product_category_sql.sql
-- Categoria do Google Shopping por produto (override manual do mapeamento automático)
-- Aceita ID numérico (ex.: "2271") OU caminho completo (ex.: "Saúde e beleza > Cuidados pessoais > Cosméticos")
ALTER TABLE products ADD COLUMN IF NOT EXISTS google_product_category VARCHAR(255);

COMMENT ON COLUMN products.google_product_category IS
  'Categoria de produto do Google Shopping (taxonomy-with-ids). ID ou caminho completo. Se vazio, o feed usa um mapeamento automático pela categoria da loja.';


-- FILE 119_mig_202507111510_seo_audit_fixes_sql.sql
-- Auditoria Google (misrepresentation policy) — correções de dados encontradas:
-- 1) Link do footer "Quem Somos" apontava para /quem-somos (404); rota real é /paginas/quem-somos.
-- 2) Link "Ajuda" do topo apontava para /paginas/central-de-ajuda, página que nunca existiu (404).
--    Redirecionado para /fale-conosco, página de contato real e ativa.
-- 3) Typo no menu principal: "Preteção Solar" -> "Proteção Solar".
-- 4) seo_title_template/seo_description continham o placeholder padrão "Sua Loja" em vez do
--    nome real da loja — o <title> e a meta description de TODAS as páginas exibiam "Sua Loja".
-- 5) Link do Instagram apontava para "instagram.com/lojaexemplo" (conta de terceiros/placeholder,
--    não pertence à loja) — desativado para não veicular identidade/afiliação falsa.

UPDATE footer_menu_items SET href = '/paginas/quem-somos' WHERE href = '/quem-somos';

UPDATE site_settings
SET help_href = '/fale-conosco'
WHERE id = '00000000-0000-0000-0000-000000000001' AND help_href = '/paginas/central-de-ajuda';

UPDATE menu_items SET label = 'Proteção Solar' WHERE label = 'Preteção Solar';

UPDATE site_settings
SET
  seo_title_template = '%s | Atlas Cosméticos',
  seo_description = 'A Atlas Cosméticos é uma loja virtual especializada em produtos de beleza e cuidados pessoais, com atendimento dedicado e compra 100% online.'
WHERE id = '00000000-0000-0000-0000-000000000001';

UPDATE social_links SET active = false WHERE href ILIKE '%lojaexemplo%';

-- 6) return_enabled estava false e return_days=7, mas a Política de Trocas e Devoluções
--    publicada promete 30 dias (art. 49 CDC). Corrige a config para refletir a mesma
--    informação exibida ao cliente (fonte única de verdade) e habilita o MerchantReturnPolicy
--    no schema.org / feed, hoje ausente.
UPDATE site_settings
SET return_enabled = true, return_days = 30, return_policy_page_slug = 'politica-de-trocas-e-devolucoes'
WHERE id = '00000000-0000-0000-0000-000000000001';


-- FILE 11_parte_12_woocommerce_import_sql.sql
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


-- FILE 120_mig_20260801191132_order_payment_proof_and_email_sql.sql
-- Comprovante de pagamento Pix + rastreio de e-mail de confirmação

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_proof_path TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_proof_filename TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_proof_mime_type TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_proof_uploaded_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_payment_proof_uploaded
  ON orders (payment_proof_uploaded_at DESC)
  WHERE payment_proof_uploaded_at IS NOT NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;


-- FILE 121_mig_20260804182524_store_analytics_ads_conversion_sql.sql
-- Google Ads + conversão + campos de analytics ampliados

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS google_ads_id VARCHAR(50);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS google_ads_conversion_id VARCHAR(120);

-- Clarity pode receber snippet antes da normalização no app; amplia limite
ALTER TABLE site_settings ALTER COLUMN microsoft_clarity_id TYPE VARCHAR(2000);
ALTER TABLE site_settings ALTER COLUMN google_tag_manager_id TYPE VARCHAR(100);
ALTER TABLE site_settings ALTER COLUMN google_analytics_id TYPE VARCHAR(100);


-- FILE 122_mig_20260804183306_track7_order_tracking_sql.sql
-- Campos de rastreio Track7 nos pedidos

ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS track7_synced_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS track7_last_status TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_tracking_code
  ON orders (tracking_code)
  WHERE tracking_code IS NOT NULL;


-- FILE 123_mig_20260809200000_shipping_promo_text_sql.sql
-- Texto personalizável da barra "Frete grátis para pedidos..."
ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS shipping_promo_text VARCHAR(200)
  NOT NULL DEFAULT 'Frete grátis para pedidos acima de R$ 100';

COMMENT ON COLUMN site_settings.shipping_promo_text IS
  'Texto da barra de promoção de frete grátis no topo do site';


-- FILE 124_mig_20260825150000_fix_store_legal_identity_sql.sql
-- Corrige identidade legal / contato da Atlas Cosmeticos (sem acentos em fantasia e razão social).
UPDATE site_settings
SET
  store_name = 'Atlas Cosmeticos',
  company_legal_name = 'ATLAS NEGOCIOS INTEGRADOS LTDA',
  cnpj = '67.006.230/0001-39',
  contact_email = 'atendimento@atlascosmeticos.com',
  contact_address = 'Avenida Portugal, 1148 - Quadra L29 Lote 1E Sala C2501 - Set. Marista - Goiânia - Goiás, CEP: 74150-030',
  store_street = 'Avenida Portugal',
  store_street_number = '1148',
  store_complement = 'Quadra L29 Lote 1E Sala C2501',
  store_neighborhood = 'Set. Marista',
  store_city = 'Goiânia',
  store_state = 'GO',
  store_postal_code = '74150-030',
  phone_area_code = '62',
  phone_number = '9601-3205',
  phone_href = 'tel:+5562996013205',
  seo_title = 'Atlas Cosmeticos',
  seo_title_template = '%s | Atlas Cosmeticos',
  seo_description = replace(
    COALESCE(
      NULLIF(trim(seo_description), ''),
      'A Atlas Cosmeticos é uma loja virtual especializada em produtos de beleza e cuidados pessoais, com atendimento dedicado e compra 100% online.'
    ),
    'Atlas Cosméticos',
    'Atlas Cosmeticos'
  )
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Normaliza menções com acento incorreto no conteúdo das páginas institucionais/políticas.
UPDATE footer_pages
SET content = replace(content, 'Atlas Cosméticos', 'Atlas Cosmeticos')
WHERE content LIKE '%Atlas Cosméticos%';

UPDATE footer_pages
SET content = replace(content, 'ATLAS NEGÓCIOS INTEGRADOS LTDA', 'ATLAS NEGOCIOS INTEGRADOS LTDA')
WHERE content LIKE '%ATLAS NEGÓCIOS INTEGRADOS LTDA%';


-- FILE 12_parte_13_shipping_methods_sql.sql
-- =============================================================================
-- PARTE 13 — Formas de frete (admin + calculadora)
-- =============================================================================

CREATE TABLE IF NOT EXISTS shipping_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  base_price NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (base_price >= 0),
  free_above NUMERIC(10, 2) CHECK (free_above IS NULL OR free_above >= 0),
  estimated_days_min INT CHECK (estimated_days_min IS NULL OR estimated_days_min >= 0),
  estimated_days_max INT CHECK (estimated_days_max IS NULL OR estimated_days_max >= 0),
  cep_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipping_methods_sort
  ON shipping_methods (sort_order)
  WHERE active = true;

DROP TRIGGER IF EXISTS set_updated_at_shipping_methods ON shipping_methods;
CREATE TRIGGER set_updated_at_shipping_methods
  BEFORE UPDATE ON shipping_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE shipping_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shipping_methods_public_read" ON shipping_methods;
DROP POLICY IF EXISTS "shipping_methods_admin_all" ON shipping_methods;

CREATE POLICY "shipping_methods_public_read"
  ON shipping_methods FOR SELECT USING (active = true);

CREATE POLICY "shipping_methods_admin_all"
  ON shipping_methods FOR ALL USING (is_admin()) WITH CHECK (is_admin());

INSERT INTO shipping_methods (name, description, base_price, free_above, estimated_days_min, estimated_days_max, sort_order)
SELECT 'PAC', 'Entrega econômica pelos Correios', 18.90, 199.00, 5, 12, 10
WHERE NOT EXISTS (SELECT 1 FROM shipping_methods LIMIT 1);

INSERT INTO shipping_methods (name, description, base_price, free_above, estimated_days_min, estimated_days_max, sort_order)
SELECT 'SEDEX', 'Entrega expressa', 32.90, 299.00, 2, 5, 20
WHERE NOT EXISTS (SELECT 1 FROM shipping_methods WHERE name = 'SEDEX');

INSERT INTO shipping_methods (name, description, base_price, free_above, estimated_days_min, estimated_days_max, sort_order)
SELECT 'Retirada na loja', 'Retire sem custo de frete', 0, NULL, 1, 2, 30
WHERE NOT EXISTS (SELECT 1 FROM shipping_methods WHERE name = 'Retirada na loja');


-- FILE 13_parte_14_collection_fields_sql.sql
-- PARTE 14 — Campos de coleção em categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS banner_image_url TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS seal_image_url TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS page_title VARCHAR(200);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;


-- FILE 14_parte_14b_merge_seal_into_image_sql.sql
-- Unifica selo antigo em image_url (campo único para home e carrosséis)
UPDATE categories
SET image_url = seal_image_url
WHERE image_url IS NULL AND seal_image_url IS NOT NULL;


-- FILE 15_parte_15_banner_device_target_sql.sql
-- PARTE 15 — Destino do banner (desktop / mobile / ambos)
ALTER TABLE home_banners
  ADD COLUMN IF NOT EXISTS device_target VARCHAR(20) NOT NULL DEFAULT 'both';

ALTER TABLE home_banners DROP CONSTRAINT IF EXISTS home_banners_device_target_check;
ALTER TABLE home_banners
  ADD CONSTRAINT home_banners_device_target_check
  CHECK (device_target IN ('both', 'desktop', 'mobile'));
