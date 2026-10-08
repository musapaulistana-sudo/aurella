-- =============================================================================
-- PARTE 12 — Sistema de rodapé (páginas CMS, assets, configurações)
-- Execute após PARTE_1 e PARTE_3. Conteúdo idêntico à migration 202506170001.
-- =============================================================================

ALTER TABLE footer_pages ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
ALTER TABLE footer_pages ADD COLUMN IF NOT EXISTS show_in_footer BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE footer_pages ADD COLUMN IF NOT EXISTS meta_description VARCHAR(300);

ALTER TABLE footer_pages DROP CONSTRAINT IF EXISTS footer_pages_page_type_check;
ALTER TABLE footer_pages ADD CONSTRAINT footer_pages_page_type_check
  CHECK (page_type IN ('institutional', 'policy', 'services', 'support'));

CREATE INDEX IF NOT EXISTS idx_footer_pages_sort
  ON footer_pages (page_type, sort_order)
  WHERE active = true AND show_in_footer = true;

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

ALTER TABLE footer_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "footer_assets_public_read" ON footer_assets;
DROP POLICY IF EXISTS "footer_assets_admin_all" ON footer_assets;

CREATE POLICY "footer_assets_public_read"
  ON footer_assets FOR SELECT USING (active = true);

CREATE POLICY "footer_assets_admin_all"
  ON footer_assets FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Seed de páginas (somente se a tabela estiver vazia)
INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer)
SELECT 'sobre-a-loja', 'Sobre a loja', 'institutional', 10, '<p>Conteúdo sobre a sua loja.</p>', true, true
WHERE NOT EXISTS (SELECT 1 FROM footer_pages LIMIT 1);

INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer)
SELECT 'central-de-ajuda', 'Central de Ajuda', 'support', 20, '<p>Como podemos ajudar?</p>', true, true
WHERE NOT EXISTS (SELECT 1 FROM footer_pages WHERE slug = 'central-de-ajuda');

INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer)
SELECT 'politica-de-privacidade', 'Política de Privacidade', 'policy', 30, '<p>Sua política de privacidade.</p>', true, true
WHERE NOT EXISTS (SELECT 1 FROM footer_pages WHERE slug = 'politica-de-privacidade');

INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer)
SELECT 'termo-de-uso', 'Termo de Uso', 'policy', 40, '<p>Termos de uso do site.</p>', true, true
WHERE NOT EXISTS (SELECT 1 FROM footer_pages WHERE slug = 'termo-de-uso');

INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer)
SELECT 'formas-de-pagamento', 'Formas de Pagamento', 'services', 10, '<p>Formas de pagamento aceitas.</p>', true, true
WHERE NOT EXISTS (SELECT 1 FROM footer_pages WHERE slug = 'formas-de-pagamento');

INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer)
SELECT 'prazo-e-entrega', 'Prazo e Entrega', 'services', 20, '<p>Informações sobre entrega.</p>', true, true
WHERE NOT EXISTS (SELECT 1 FROM footer_pages WHERE slug = 'prazo-e-entrega');

INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer)
SELECT 'frete-gratis', 'Frete Grátis', 'services', 30, '<p>Regras do frete grátis.</p>', true, true
WHERE NOT EXISTS (SELECT 1 FROM footer_pages WHERE slug = 'frete-gratis');

INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer)
SELECT 'trocas-e-devolucoes', 'Trocas e Devoluções', 'services', 40, '<p>Política de trocas.</p>', true, true
WHERE NOT EXISTS (SELECT 1 FROM footer_pages WHERE slug = 'trocas-e-devolucoes');

INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer)
SELECT 'fale-conosco', 'Fale Conosco', 'support', 30, '<p>Entre em contato conosco.</p>', true, true
WHERE NOT EXISTS (SELECT 1 FROM footer_pages WHERE slug = 'fale-conosco');

UPDATE site_settings SET
  footer_disclaimers = '[
    "Site Seguro e Blindado. Seus dados estão Protegidos. Garantimos a entrega do produto ou devolvemos seu dinheiro.",
    "Preços válidos são os informados no carrinho de compras",
    "* O frete grátis está sujeito ao peso, preço e distância do envio.",
    "* O valor mínimo para FRETE GRÁTIS pode variar entre os estados e você poderá verificar o frete no carrinho ao inserir seu CEP.",
    "Cupons de desconto são válidos enquanto ativos no sistema e podem ser desativados a qualquer momento, sem aviso prévio"
  ]'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000001'
  AND (footer_disclaimers IS NULL OR footer_disclaimers = '[]'::jsonb);
