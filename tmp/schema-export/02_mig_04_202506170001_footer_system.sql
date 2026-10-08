-- Rodapé completo: páginas CMS, assets (pagamento/selos), configurações da loja

-- ---------------------------------------------------------------------------
-- footer_pages — colunas extras e novos tipos
-- ---------------------------------------------------------------------------
ALTER TABLE footer_pages ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
ALTER TABLE footer_pages ADD COLUMN IF NOT EXISTS show_in_footer BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE footer_pages ADD COLUMN IF NOT EXISTS meta_description VARCHAR(300);

ALTER TABLE footer_pages DROP CONSTRAINT IF EXISTS footer_pages_page_type_check;
ALTER TABLE footer_pages ADD CONSTRAINT footer_pages_page_type_check
  CHECK (page_type IN ('institutional', 'policy', 'services', 'support'));

CREATE INDEX IF NOT EXISTS idx_footer_pages_sort
  ON footer_pages (page_type, sort_order)
  WHERE active = true AND show_in_footer = true;

-- ---------------------------------------------------------------------------
-- footer_assets — ícones de pagamento e selos de segurança
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS footer_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('payment', 'security')),
  image_url TEXT NOT NULL,
  alt_text VARCHAR(150),
  href VARCHAR(300),
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_footer_assets_type_sort
  ON footer_assets (asset_type, sort_order)
  WHERE active = true;

-- ---------------------------------------------------------------------------
-- site_settings — logo em imagem e textos do rodapé
-- ---------------------------------------------------------------------------
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS logo_image_url TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS cnpj VARCHAR(20);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS company_legal_name VARCHAR(200);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_phone_label VARCHAR(100) DEFAULT 'Ligue para nós';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS business_hours TEXT DEFAULT 'Seg. a sex., das 08h30 às 17h30.';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_whatsapp_label VARCHAR(50) DEFAULT 'WhatsApp';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_whatsapp_href VARCHAR(300);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_page_label VARCHAR(50) DEFAULT 'Fale Conosco';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_page_href VARCHAR(200) DEFAULT '/paginas/fale-conosco';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_social_heading VARCHAR(80) DEFAULT 'Siga a gente:';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_security_heading VARCHAR(80) DEFAULT 'Loja Segura';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_payment_text TEXT DEFAULT 'Pague em até {count}x sem juros com';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_security_text TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_disclaimers JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ---------------------------------------------------------------------------
-- RLS footer_assets
-- ---------------------------------------------------------------------------
ALTER TABLE footer_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "footer_assets_public_read" ON footer_assets;
DROP POLICY IF EXISTS "footer_assets_admin_all" ON footer_assets;

CREATE POLICY "footer_assets_public_read"
  ON footer_assets FOR SELECT USING (active = true);

CREATE POLICY "footer_assets_admin_all"
  ON footer_assets FOR ALL USING (is_admin()) WITH CHECK (is_admin());
