-- FILE 09_parte_11_home_banners_sql.sql
-- =============================================================================
-- PARTE 11 — Banners da home (carrossel)
-- =============================================================================

CREATE TABLE IF NOT EXISTS home_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(120) NOT NULL DEFAULT '',
  alt_text VARCHAR(255),
  link_href VARCHAR(500),
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  width INT,
  height INT,
  file_size INT,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_home_banners_sort ON home_banners (sort_order, created_at);

ALTER TABLE home_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "home_banners_public_read" ON home_banners;
CREATE POLICY "home_banners_public_read"
  ON home_banners FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "home_banners_admin_all" ON home_banners;
CREATE POLICY "home_banners_admin_all"
  ON home_banners FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- FILE 100_mig_202506160001_site_layout_schema_sql.sql
-- Layout / CMS — tabelas públicas de leitura

CREATE TABLE site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name VARCHAR(100) NOT NULL DEFAULT 'Sua Loja',
  logo_brand VARCHAR(50) NOT NULL DEFAULT 'sua',
  logo_suffix VARCHAR(50) NOT NULL DEFAULT 'loja',
  logo_tagline VARCHAR(50) DEFAULT 'desde 2024',
  phone_area_code VARCHAR(10) DEFAULT '(11) ',
  phone_number VARCHAR(20) DEFAULT '3333-0000',
  phone_href VARCHAR(30) DEFAULT 'tel:+551133330000',
  help_label VARCHAR(50) DEFAULT 'Ajuda',
  help_href VARCHAR(200) DEFAULT '/paginas/central-de-ajuda',
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO site_settings (id)
VALUES ('00000000-0000-0000-0000-000000000001');

CREATE TABLE policy_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label VARCHAR(100) NOT NULL,
  href VARCHAR(200) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('whatsapp', 'facebook', 'instagram')),
  href VARCHAR(300) NOT NULL,
  label VARCHAR(50) NOT NULL,
  display TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  href VARCHAR(200) NOT NULL,
  parent_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  has_dropdown BOOLEAN DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_menu_items_sort ON menu_items(sort_order) WHERE visible = true;

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'customer'
    CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- FILE 101_mig_202506160002_site_layout_rls_sql.sql
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Leitura pública (anon)
CREATE POLICY "site_settings_public_read"
  ON site_settings FOR SELECT USING (true);

CREATE POLICY "policy_links_public_read"
  ON policy_links FOR SELECT USING (active = true);

CREATE POLICY "social_links_public_read"
  ON social_links FOR SELECT USING (active = true);

CREATE POLICY "menu_items_public_read"
  ON menu_items FOR SELECT USING (visible = true);

-- Escrita apenas admin
CREATE POLICY "site_settings_admin_all"
  ON site_settings FOR ALL USING (is_admin());

CREATE POLICY "policy_links_admin_all"
  ON policy_links FOR ALL USING (is_admin());

CREATE POLICY "social_links_admin_all"
  ON social_links FOR ALL USING (is_admin());

CREATE POLICY "menu_items_admin_all"
  ON menu_items FOR ALL USING (is_admin());

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE USING (auth.uid() = id);


-- FILE 102_mig_202506160003_site_layout_seed_sql.sql
INSERT INTO policy_links (label, href, sort_order) VALUES
  ('Este site é seguro?', '/paginas/site-seguro', 1),
  ('Quem somos', '/paginas/quem-somos', 2),
  ('Central de ajuda', '/paginas/central-de-ajuda', 3);

INSERT INTO social_links (type, href, label, display, sort_order) VALUES
  ('whatsapp', 'https://wa.me/5511999990000', 'WhatsApp', 'WhatsApp (11) 99999-0000', 1),
  ('facebook', 'https://facebook.com/lojaexemplo', 'Facebook', NULL, 2),
  ('instagram', 'https://instagram.com/lojaexemplo', 'Instagram', NULL, 3);

INSERT INTO menu_items (label, slug, href, has_dropdown, sort_order) VALUES
  ('Compre por Marca', 'marcas', '/colecoes/marcas', true, 1),
  ('Categoria A', 'categoria-a', '/colecoes/categoria-a', false, 2),
  ('Categoria B', 'categoria-b', '/colecoes/categoria-b', false, 3),
  ('Categoria C', 'categoria-c', '/colecoes/categoria-c', false, 4),
  ('Categoria D', 'categoria-d', '/colecoes/categoria-d', false, 5),
  ('Categoria E', 'categoria-e', '/colecoes/categoria-e', false, 6),
  ('Categoria F', 'categoria-f', '/colecoes/categoria-f', false, 7),
  ('Outros', 'outros', '/colecoes/outros', false, 8),
  ('Categoria G', 'categoria-g', '/colecoes/categoria-g', false, 9);


-- FILE 103_mig_202506170001_footer_system_sql.sql
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


-- FILE 104_mig_202506170002_shipping_methods_sql.sql
-- Formas de frete configuráveis no admin

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


-- FILE 105_mig_202506170003_collection_fields_sql.sql
-- Campos de coleção (banner, selo, título e descrição da página)

ALTER TABLE categories ADD COLUMN IF NOT EXISTS banner_image_url TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS seal_image_url TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS page_title VARCHAR(200);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;
