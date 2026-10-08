-- Schema bootstrap for Reis Cosmeticos destination
-- Generated for project mxslkryqrtrlclmcjvlb


-- ===== PARTE_1_tabelas.sql =====

-- =============================================================================
-- PARTE 1 â€” Tabelas (idempotente: pode rodar mesmo se layout jÃ¡ existir)
-- Rode no SQL Editor do Supabase
-- =============================================================================

-- ExtensÃ£o UUID (jÃ¡ existe no Supabase, seguro rodar)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Layout / CMS (pule erros "already exists" se jÃ¡ criou nas migrations 001â€“003)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS site_settings (
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
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS policy_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label VARCHAR(100) NOT NULL,
  href VARCHAR(200) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('whatsapp', 'facebook', 'instagram')),
  href VARCHAR(300) NOT NULL,
  label VARCHAR(50) NOT NULL,
  display TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_items (
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

CREATE INDEX IF NOT EXISTS idx_menu_items_sort ON menu_items(sort_order) WHERE visible = true;

CREATE TABLE IF NOT EXISTS footer_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(150) NOT NULL,
  content TEXT,
  page_type VARCHAR(30) DEFAULT 'institutional'
    CHECK (page_type IN ('institutional', 'policy')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- CatÃ¡logo
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  image_url TEXT,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  original_price NUMERIC(10, 2),
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  images TEXT[] DEFAULT '{}',
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- UsuÃ¡rios / perfis
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'customer'
    CHECK (role IN ('customer', 'admin')),
  cpf VARCHAR(14) UNIQUE,
  phone VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cpf VARCHAR(14) UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- ---------------------------------------------------------------------------
-- EndereÃ§os, pedidos, itens
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label VARCHAR(50) DEFAULT 'Casa',
  street VARCHAR(200) NOT NULL,
  number VARCHAR(10) NOT NULL,
  complement VARCHAR(100),
  neighborhood VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state CHAR(2) NOT NULL,
  zip_code VARCHAR(9) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  subtotal NUMERIC(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_products ON products;
CREATE TRIGGER set_updated_at_products
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_footer_pages ON footer_pages;
CREATE TRIGGER set_updated_at_footer_pages
  BEFORE UPDATE ON footer_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_orders ON orders;
CREATE TRIGGER set_updated_at_orders
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'UsuÃ¡rio'),
    'customer'
  )
  ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON profiles TO supabase_auth_admin;
GRANT INSERT ON profiles TO postgres, supabase_auth_admin;


-- ===== PARTE_2_seguranca_profiles.sql =====

-- =============================================================================
-- PARTE 2 â€” SeguranÃ§a de profiles (anti-escalaÃ§Ã£o de role)
-- Pule se jÃ¡ aplicou â€” Ã© idempotente
-- =============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION prevent_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  IF current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  jwt_role := current_setting('request.jwt.claim.role', true);
  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role AND NOT is_admin() THEN
    NEW.role := OLD.role;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_role_escalation ON profiles;
CREATE TRIGGER profiles_prevent_role_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_role_self_escalation();

-- Impede INSERT manual em profiles (sÃ³ trigger auth.users)
REVOKE INSERT ON profiles FROM authenticated, anon;


-- ===== PARTE_3_rls_policies.sql =====

-- =============================================================================
-- PARTE 3 â€” RLS em TODAS as tabelas + policies
-- Idempotente: remove policies antigas e recria
-- =============================================================================

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE footer_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ---------- site_settings ----------
DROP POLICY IF EXISTS "site_settings_public_read" ON site_settings;
DROP POLICY IF EXISTS "site_settings_admin_all" ON site_settings;
CREATE POLICY "site_settings_public_read" ON site_settings FOR SELECT USING (true);
CREATE POLICY "site_settings_admin_all" ON site_settings FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ---------- policy_links ----------
DROP POLICY IF EXISTS "policy_links_public_read" ON policy_links;
DROP POLICY IF EXISTS "policy_links_admin_all" ON policy_links;
CREATE POLICY "policy_links_public_read" ON policy_links FOR SELECT USING (active = true);
CREATE POLICY "policy_links_admin_all" ON policy_links FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ---------- social_links ----------
DROP POLICY IF EXISTS "social_links_public_read" ON social_links;
DROP POLICY IF EXISTS "social_links_admin_all" ON social_links;
CREATE POLICY "social_links_public_read" ON social_links FOR SELECT USING (active = true);
CREATE POLICY "social_links_admin_all" ON social_links FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ---------- menu_items ----------
DROP POLICY IF EXISTS "menu_items_public_read" ON menu_items;
DROP POLICY IF EXISTS "menu_items_admin_all" ON menu_items;
CREATE POLICY "menu_items_public_read" ON menu_items FOR SELECT USING (visible = true);
CREATE POLICY "menu_items_admin_all" ON menu_items FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ---------- footer_pages ----------
DROP POLICY IF EXISTS "footer_pages_public_read" ON footer_pages;
DROP POLICY IF EXISTS "footer_pages_admin_all" ON footer_pages;
CREATE POLICY "footer_pages_public_read" ON footer_pages FOR SELECT USING (active = true);
CREATE POLICY "footer_pages_admin_all" ON footer_pages FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ---------- categories ----------
DROP POLICY IF EXISTS "categories_public_read" ON categories;
DROP POLICY IF EXISTS "categories_admin_all" ON categories;
CREATE POLICY "categories_public_read" ON categories FOR SELECT USING (active = true);
CREATE POLICY "categories_admin_all" ON categories FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ---------- products ----------
DROP POLICY IF EXISTS "products_public_read" ON products;
DROP POLICY IF EXISTS "products_admin_all" ON products;
CREATE POLICY "products_public_read" ON products FOR SELECT USING (active = true);
CREATE POLICY "products_admin_all" ON products FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ---------- profiles ----------
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT USING (is_admin());
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_admin" ON profiles
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ---------- addresses ----------
DROP POLICY IF EXISTS "addresses_select_own" ON addresses;
DROP POLICY IF EXISTS "addresses_insert_own" ON addresses;
DROP POLICY IF EXISTS "addresses_update_own" ON addresses;
DROP POLICY IF EXISTS "addresses_delete_own" ON addresses;
DROP POLICY IF EXISTS "addresses_admin_all" ON addresses;
CREATE POLICY "addresses_select_own" ON addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "addresses_insert_own" ON addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "addresses_update_own" ON addresses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "addresses_delete_own" ON addresses FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "addresses_admin_all" ON addresses FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ---------- orders ----------
DROP POLICY IF EXISTS "orders_select_own" ON orders;
DROP POLICY IF EXISTS "orders_insert_own" ON orders;
DROP POLICY IF EXISTS "orders_admin_all" ON orders;
CREATE POLICY "orders_select_own" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "orders_insert_own" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders_admin_all" ON orders FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ---------- order_items (via pedido do usuÃ¡rio) ----------
DROP POLICY IF EXISTS "order_items_select_own" ON order_items;
DROP POLICY IF EXISTS "order_items_insert_own" ON order_items;
DROP POLICY IF EXISTS "order_items_admin_all" ON order_items;
CREATE POLICY "order_items_select_own" ON order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
  )
);
CREATE POLICY "order_items_insert_own" ON order_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
  )
);
CREATE POLICY "order_items_admin_all" ON order_items FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ===== PARTE_4_storage.sql =====

-- =============================================================================
-- PARTE 4 â€” Storage buckets + policies
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('categories', 'categories', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('banners', 'banners', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('site-assets', 'site-assets', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Leitura pÃºblica
DROP POLICY IF EXISTS "storage_public_read" ON storage.objects;
CREATE POLICY "storage_public_read" ON storage.objects
  FOR SELECT USING (bucket_id IN ('product-images', 'categories', 'banners', 'site-assets'));

-- Upload/update/delete sÃ³ admin
DROP POLICY IF EXISTS "storage_admin_write" ON storage.objects;
CREATE POLICY "storage_admin_write" ON storage.objects
  FOR ALL USING (
    bucket_id IN ('product-images', 'categories', 'banners', 'site-assets')
    AND is_admin()
  ) WITH CHECK (
    bucket_id IN ('product-images', 'categories', 'banners', 'site-assets')
    AND is_admin()
  );


-- ===== PARTE_6_fix_signup.sql =====

-- =============================================================================
-- PARTE 6 â€” Corrigir cadastro (trigger profiles + permissÃµes)
-- Rode no SQL Editor se o cadastro retorna 400
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'UsuÃ¡rio'),
    'customer'
  )
  ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name;
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'handle_new_user error: %', SQLERRM;
    RAISE;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PermissÃµes para o Auth criar perfis via trigger
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.profiles TO supabase_auth_admin;
GRANT INSERT ON public.profiles TO postgres, supabase_auth_admin;

-- Garante INSERT apenas via trigger (nÃ£o pelo cliente)
REVOKE INSERT ON public.profiles FROM authenticated, anon;

-- Policy explÃ­cita para o service role / auth admin inserir perfis
DROP POLICY IF EXISTS "profiles_insert_service" ON public.profiles;
CREATE POLICY "profiles_insert_service"
  ON public.profiles
  FOR INSERT
  TO supabase_auth_admin
  WITH CHECK (true);


-- ===== PARTE_8_fix_admin_promotion.sql =====

-- =============================================================================
-- PARTE 8 â€” Corrigir promoÃ§Ã£o a admin (trigger bloqueava SQL Editor)
--
-- O trigger prevent_role_self_escalation impedia QUALQUER mudanÃ§a de role
-- quando auth.uid() nÃ£o era admin â€” inclusive no SQL Editor (auth.uid() = NULL).
-- Resultado: UPDATE SET role = 'admin' parecia funcionar mas voltava a customer.
-- =============================================================================

CREATE OR REPLACE FUNCTION prevent_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  -- SQL Editor / migrations (postgres)
  IF current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- Service role (API server, scripts locais)
  jwt_role := current_setting('request.jwt.claim.role', true);
  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- UsuÃ¡rio comum nÃ£o pode alterar o prÃ³prio role
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT is_admin() THEN
    NEW.role := OLD.role;
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================================================
-- Depois de rodar PARTE 8, promova o admin (TROQUE O E-MAIL):
-- =============================================================================

INSERT INTO public.profiles (id, name, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1), 'Admin'),
  'admin'
FROM auth.users u
WHERE lower(u.email) = lower('admin@gmail.com')
ON CONFLICT (id) DO UPDATE
SET role = 'admin';

-- Verificar (role deve ser 'admin'):
SELECT u.email, p.role, p.name
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE lower(u.email) = lower('admin@gmail.com');


-- ===== PARTE_9_products_media.sql =====

-- =============================================================================
-- PARTE 9 â€” Produtos avanÃ§ados: marcas, mÃ­dia, categorias mÃºltiplas, SEO
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


-- ===== PARTE_10_payment_settings.sql =====

-- =============================================================================
-- PARTE 10 â€” ConfiguraÃ§Ãµes de parcelamento e pagamento (site_settings)
-- =============================================================================

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS installment_max INT NOT NULL DEFAULT 12;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS installment_interest_free INT NOT NULL DEFAULT 5;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS installment_min_value NUMERIC(10, 2) NOT NULL DEFAULT 5.00;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS installment_interest_rate NUMERIC(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS installment_text_free TEXT NOT NULL DEFAULT '{count}x de {value} sem juros';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS installment_text_interest TEXT NOT NULL DEFAULT '{count}x de {value} com juros';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS payment_methods JSONB NOT NULL DEFAULT '["visa","mastercard","elo","pix","boleto"]'::jsonb;


-- ===== PARTE_11_home_banners.sql =====

-- =============================================================================
-- PARTE 11 â€” Banners da home (carrossel)
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


-- ===== PARTE_12_footer_system.sql =====

-- =============================================================================
-- PARTE 12 â€” Sistema de rodapÃ© (pÃ¡ginas CMS, assets, configuraÃ§Ãµes)
-- Execute apÃ³s PARTE_1 e PARTE_3. ConteÃºdo idÃªntico Ã  migration 202506170001.
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
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_phone_label VARCHAR(100) DEFAULT 'Ligue para nÃ³s';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS business_hours TEXT DEFAULT 'Seg. a sex., das 08h30 Ã s 17h30.';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_whatsapp_label VARCHAR(50) DEFAULT 'WhatsApp';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_whatsapp_href VARCHAR(300);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_page_label VARCHAR(50) DEFAULT 'Fale Conosco';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_page_href VARCHAR(200) DEFAULT '/paginas/fale-conosco';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_social_heading VARCHAR(80) DEFAULT 'Siga a gente:';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_security_heading VARCHAR(80) DEFAULT 'Loja Segura';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_payment_text TEXT DEFAULT 'Pague em atÃ© {count}x sem juros com';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_security_text TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_disclaimers JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE footer_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "footer_assets_public_read" ON footer_assets;
DROP POLICY IF EXISTS "footer_assets_admin_all" ON footer_assets;

CREATE POLICY "footer_assets_public_read"
  ON footer_assets FOR SELECT USING (active = true);

CREATE POLICY "footer_assets_admin_all"
  ON footer_assets FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Seed de pÃ¡ginas (somente se a tabela estiver vazia)
INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer)
SELECT 'sobre-a-loja', 'Sobre a loja', 'institutional', 10, '<p>ConteÃºdo sobre a sua loja.</p>', true, true
WHERE NOT EXISTS (SELECT 1 FROM footer_pages LIMIT 1);

INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer)
SELECT 'central-de-ajuda', 'Central de Ajuda', 'support', 20, '<p>Como podemos ajudar?</p>', true, true
WHERE NOT EXISTS (SELECT 1 FROM footer_pages WHERE slug = 'central-de-ajuda');

INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer)
SELECT 'politica-de-privacidade', 'PolÃ­tica de Privacidade', 'policy', 30, '<p>Sua polÃ­tica de privacidade.</p>', true, true
WHERE NOT EXISTS (SELECT 1 FROM footer_pages WHERE slug = 'politica-de-privacidade');

INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer)
SELECT 'termo-de-uso', 'Termo de Uso', 'policy', 40, '<p>Termos de uso do site.</p>', true, true
WHERE NOT EXISTS (SELECT 1 FROM footer_pages WHERE slug = 'termo-de-uso');

INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer)
SELECT 'formas-de-pagamento', 'Formas de Pagamento', 'services', 10, '<p>Formas de pagamento aceitas.</p>', true, true
WHERE NOT EXISTS (SELECT 1 FROM footer_pages WHERE slug = 'formas-de-pagamento');

INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer)
SELECT 'prazo-e-entrega', 'Prazo e Entrega', 'services', 20, '<p>InformaÃ§Ãµes sobre entrega.</p>', true, true
WHERE NOT EXISTS (SELECT 1 FROM footer_pages WHERE slug = 'prazo-e-entrega');

INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer)
SELECT 'frete-gratis', 'Frete GrÃ¡tis', 'services', 30, '<p>Regras do frete grÃ¡tis.</p>', true, true
WHERE NOT EXISTS (SELECT 1 FROM footer_pages WHERE slug = 'frete-gratis');

INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer)
SELECT 'trocas-e-devolucoes', 'Trocas e DevoluÃ§Ãµes', 'services', 40, '<p>PolÃ­tica de trocas.</p>', true, true
WHERE NOT EXISTS (SELECT 1 FROM footer_pages WHERE slug = 'trocas-e-devolucoes');

INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer)
SELECT 'fale-conosco', 'Fale Conosco', 'support', 30, '<p>Entre em contato conosco.</p>', true, true
WHERE NOT EXISTS (SELECT 1 FROM footer_pages WHERE slug = 'fale-conosco');

UPDATE site_settings SET
  footer_disclaimers = '[
    "Site Seguro e Blindado. Seus dados estÃ£o Protegidos. Garantimos a entrega do produto ou devolvemos seu dinheiro.",
    "PreÃ§os vÃ¡lidos sÃ£o os informados no carrinho de compras",
    "* O frete grÃ¡tis estÃ¡ sujeito ao peso, preÃ§o e distÃ¢ncia do envio.",
    "* O valor mÃ­nimo para FRETE GRÃTIS pode variar entre os estados e vocÃª poderÃ¡ verificar o frete no carrinho ao inserir seu CEP.",
    "Cupons de desconto sÃ£o vÃ¡lidos enquanto ativos no sistema e podem ser desativados a qualquer momento, sem aviso prÃ©vio"
  ]'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000001'
  AND (footer_disclaimers IS NULL OR footer_disclaimers = '[]'::jsonb);


-- ===== PARTE_12_woocommerce_import.sql =====

-- =============================================================================
-- PARTE 12 â€” ImportaÃ§Ã£o WooCommerce (campos de rastreio + Ã­ndices)
-- Execute ANTES de importar produtos via CSV no admin.
-- Requer PARTE_9_products_media.sql (marcas, mÃ­dia, categorias mÃºltiplas, SEO).
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


-- ===== PARTE_13_shipping_methods.sql =====

-- =============================================================================
-- PARTE 13 â€” Formas de frete (admin + calculadora)
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
SELECT 'PAC', 'Entrega econÃ´mica pelos Correios', 18.90, 199.00, 5, 12, 10
WHERE NOT EXISTS (SELECT 1 FROM shipping_methods LIMIT 1);

INSERT INTO shipping_methods (name, description, base_price, free_above, estimated_days_min, estimated_days_max, sort_order)
SELECT 'SEDEX', 'Entrega expressa', 32.90, 299.00, 2, 5, 20
WHERE NOT EXISTS (SELECT 1 FROM shipping_methods WHERE name = 'SEDEX');

INSERT INTO shipping_methods (name, description, base_price, free_above, estimated_days_min, estimated_days_max, sort_order)
SELECT 'Retirada na loja', 'Retire sem custo de frete', 0, NULL, 1, 2, 30
WHERE NOT EXISTS (SELECT 1 FROM shipping_methods WHERE name = 'Retirada na loja');


-- ===== PARTE_14_collection_fields.sql =====

-- PARTE 14 â€” Campos de coleÃ§Ã£o em categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS banner_image_url TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS seal_image_url TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS page_title VARCHAR(200);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;


-- ===== PARTE_14b_merge_seal_into_image.sql =====

-- Unifica selo antigo em image_url (campo Ãºnico para home e carrossÃ©is)
UPDATE categories
SET image_url = seal_image_url
WHERE image_url IS NULL AND seal_image_url IS NOT NULL;


-- ===== PARTE_15_banner_device_target.sql =====

-- PARTE 15 â€” Destino do banner (desktop / mobile / ambos)
ALTER TABLE home_banners
  ADD COLUMN IF NOT EXISTS device_target VARCHAR(20) NOT NULL DEFAULT 'both';

ALTER TABLE home_banners DROP CONSTRAINT IF EXISTS home_banners_device_target_check;
ALTER TABLE home_banners
  ADD CONSTRAINT home_banners_device_target_check
  CHECK (device_target IN ('both', 'desktop', 'mobile'));


-- ===== migration 202506160001_site_layout_schema.sql =====

-- Layout / CMS â€” tabelas pÃºblicas de leitura

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
    COALESCE(NEW.raw_user_meta_data->>'name', 'UsuÃ¡rio')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ===== migration 202506160002_site_layout_rls.sql =====

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

-- Leitura pÃºblica (anon)
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


-- ===== migration 202506160003_site_layout_seed.sql =====

INSERT INTO policy_links (label, href, sort_order) VALUES
  ('Este site Ã© seguro?', '/paginas/site-seguro', 1),
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


-- ===== migration 202506170001_footer_system.sql =====

-- RodapÃ© completo: pÃ¡ginas CMS, assets (pagamento/selos), configuraÃ§Ãµes da loja

-- ---------------------------------------------------------------------------
-- footer_pages â€” colunas extras e novos tipos
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
-- footer_assets â€” Ã­cones de pagamento e selos de seguranÃ§a
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
-- site_settings â€” logo em imagem e textos do rodapÃ©
-- ---------------------------------------------------------------------------
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS logo_image_url TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS cnpj VARCHAR(20);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS company_legal_name VARCHAR(200);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_phone_label VARCHAR(100) DEFAULT 'Ligue para nÃ³s';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS business_hours TEXT DEFAULT 'Seg. a sex., das 08h30 Ã s 17h30.';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_whatsapp_label VARCHAR(50) DEFAULT 'WhatsApp';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_whatsapp_href VARCHAR(300);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_page_label VARCHAR(50) DEFAULT 'Fale Conosco';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_page_href VARCHAR(200) DEFAULT '/paginas/fale-conosco';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_social_heading VARCHAR(80) DEFAULT 'Siga a gente:';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_security_heading VARCHAR(80) DEFAULT 'Loja Segura';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_payment_text TEXT DEFAULT 'Pague em atÃ© {count}x sem juros com';
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


-- ===== migration 202506170002_shipping_methods.sql =====

-- Formas de frete configurÃ¡veis no admin

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


-- ===== migration 202506170003_collection_fields.sql =====

-- Campos de coleÃ§Ã£o (banner, selo, tÃ­tulo e descriÃ§Ã£o da pÃ¡gina)

ALTER TABLE categories ADD COLUMN IF NOT EXISTS banner_image_url TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS seal_image_url TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS page_title VARCHAR(200);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;


-- ===== migration 202506170004_banner_device_target.sql =====

-- Destino do banner: ambos os dispositivos, sÃ³ desktop ou sÃ³ mobile
ALTER TABLE home_banners
  ADD COLUMN IF NOT EXISTS device_target VARCHAR(20) NOT NULL DEFAULT 'both';

ALTER TABLE home_banners DROP CONSTRAINT IF EXISTS home_banners_device_target_check;
ALTER TABLE home_banners
  ADD CONSTRAINT home_banners_device_target_check
  CHECK (device_target IN ('both', 'desktop', 'mobile'));


-- ===== migration 202507010001_seo_and_contact_email.sql =====

-- SEO da loja e e-mail de contato no rodapÃ©
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS seo_title VARCHAR(100);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS seo_title_template VARCHAR(100) DEFAULT '%s | Sua Loja';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS seo_description VARCHAR(300);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS seo_og_image_url TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_email VARCHAR(200);

UPDATE site_settings
SET
  seo_title = COALESCE(seo_title, store_name),
  seo_title_template = COALESCE(seo_title_template, '%s | ' || store_name),
  seo_description = COALESCE(
    seo_description,
    'Compre cosmÃ©ticos e produtos de beleza na ' || store_name || '.'
  )
WHERE id = '00000000-0000-0000-0000-000000000001';


-- ===== migration 202507010002_payment_method_images_and_address.sql =====

-- Ãcones das formas de pagamento (vinculados Ã s opÃ§Ãµes em site_settings.payment_methods)
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS payment_method_images JSONB NOT NULL DEFAULT '{}'::jsonb;

-- EndereÃ§o no rodapÃ©
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_address TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_address_label VARCHAR(100) DEFAULT 'EndereÃ§o';


-- ===== migration 202507010003_payment_methods_config.sql =====

-- Formas de pagamento configurÃ¡veis (nome + Ã­cone por item)
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS payment_methods_config JSONB NOT NULL DEFAULT '[]'::jsonb;


-- ===== migration 202507020001_checkout_orders_security.sql =====

-- P0: RLS seguro para pedidos + checkout transacional (sem INSERT direto pelo client)

-- ---------------------------------------------------------------------------
-- Colunas de checkout / pagamento
-- ---------------------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_price NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_method_id UUID REFERENCES shipping_methods(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_method_name VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) NOT NULL DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_checkout_id BIGINT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_secure_id VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_transaction_id BIGINT;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'refused', 'refunded', 'cancelled'));

-- ---------------------------------------------------------------------------
-- RLS ecommerce (idempotente) â€” pedidos SEM insert pelo client
-- ---------------------------------------------------------------------------
ALTER TABLE footer_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "footer_pages_public_read" ON footer_pages;
DROP POLICY IF EXISTS "footer_pages_admin_all" ON footer_pages;
CREATE POLICY "footer_pages_public_read" ON footer_pages FOR SELECT USING (active = true);
CREATE POLICY "footer_pages_admin_all" ON footer_pages FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "categories_public_read" ON categories;
DROP POLICY IF EXISTS "categories_admin_all" ON categories;
CREATE POLICY "categories_public_read" ON categories FOR SELECT USING (active = true);
CREATE POLICY "categories_admin_all" ON categories FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "products_public_read" ON products;
DROP POLICY IF EXISTS "products_admin_all" ON products;
CREATE POLICY "products_public_read" ON products FOR SELECT USING (active = true);
CREATE POLICY "products_admin_all" ON products FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "addresses_select_own" ON addresses;
DROP POLICY IF EXISTS "addresses_insert_own" ON addresses;
DROP POLICY IF EXISTS "addresses_update_own" ON addresses;
DROP POLICY IF EXISTS "addresses_delete_own" ON addresses;
DROP POLICY IF EXISTS "addresses_admin_all" ON addresses;
CREATE POLICY "addresses_select_own" ON addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "addresses_insert_own" ON addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "addresses_update_own" ON addresses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "addresses_delete_own" ON addresses FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "addresses_admin_all" ON addresses FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "orders_select_own" ON orders;
DROP POLICY IF EXISTS "orders_insert_own" ON orders;
DROP POLICY IF EXISTS "orders_admin_all" ON orders;
CREATE POLICY "orders_select_own" ON orders FOR SELECT USING (auth.uid() = user_id);
-- INSERT removido: pedidos sÃ³ via RPC (service role)
CREATE POLICY "orders_admin_all" ON orders FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "order_items_select_own" ON order_items;
DROP POLICY IF EXISTS "order_items_insert_own" ON order_items;
DROP POLICY IF EXISTS "order_items_admin_all" ON order_items;
CREATE POLICY "order_items_select_own" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid())
);
-- INSERT removido: itens sÃ³ via RPC
CREATE POLICY "order_items_admin_all" ON order_items FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE INDEX IF NOT EXISTS idx_orders_payout_checkout ON orders(payout_checkout_id);
CREATE INDEX IF NOT EXISTS idx_orders_payout_secure ON orders(payout_secure_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category ON product_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

-- ---------------------------------------------------------------------------
-- Frete (mesma lÃ³gica do app)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION resolve_shipping_price(
  p_base_price NUMERIC,
  p_free_above NUMERIC,
  p_subtotal NUMERIC,
  p_cep TEXT,
  p_cep_rules JSONB
) RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_price NUMERIC := COALESCE(p_base_price, 0);
  v_rule JSONB;
  v_prefix TEXT;
  v_matched NUMERIC;
BEGIN
  IF p_cep_rules IS NOT NULL AND jsonb_typeof(p_cep_rules) = 'array' THEN
    FOR v_rule IN SELECT value FROM jsonb_array_elements(p_cep_rules) AS t(value)
    LOOP
      IF v_rule ? 'prefixes' AND jsonb_typeof(v_rule->'prefixes') = 'array' THEN
        FOR v_prefix IN SELECT jsonb_array_elements_text(v_rule->'prefixes')
        LOOP
          IF p_cep LIKE v_prefix || '%' THEN
            v_matched := (v_rule->>'price')::NUMERIC;
            IF v_matched IS NOT NULL THEN
              v_price := v_matched;
            END IF;
            EXIT;
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  IF p_free_above IS NOT NULL AND p_subtotal >= p_free_above THEN
    RETURN 0;
  END IF;

  RETURN GREATEST(v_price, 0);
END;
$$;

-- ---------------------------------------------------------------------------
-- Criar pedido + decrementar estoque (transacional)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_checkout_order(
  p_user_id UUID,
  p_address_id UUID,
  p_shipping_method_id UUID,
  p_items JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_address addresses%ROWTYPE;
  v_item JSONB;
  v_product products%ROWTYPE;
  v_method shipping_methods%ROWTYPE;
  v_subtotal NUMERIC(10, 2) := 0;
  v_shipping_price NUMERIC(10, 2);
  v_total NUMERIC(10, 2);
  v_order_id UUID;
  v_qty INT;
  v_cep TEXT;
  v_product_id UUID;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'EMPTY_CART';
  END IF;

  SELECT * INTO v_address FROM addresses WHERE id = p_address_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ADDRESS_NOT_FOUND';
  END IF;

  v_cep := regexp_replace(COALESCE(v_address.zip_code, ''), '\D', '', 'g');
  IF length(v_cep) <> 8 THEN
    RAISE EXCEPTION 'INVALID_CEP';
  END IF;

  SELECT * INTO v_method FROM shipping_methods WHERE id = p_shipping_method_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SHIPPING_NOT_FOUND';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) AS t(value)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'quantity')::INT;

    IF v_product_id IS NULL OR v_qty IS NULL OR v_qty < 1 OR v_qty > 99 THEN
      RAISE EXCEPTION 'INVALID_ITEM';
    END IF;

    SELECT * INTO v_product FROM products WHERE id = v_product_id AND active = true FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
    END IF;

    IF v_product.stock < v_qty THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK';
    END IF;

    v_subtotal := v_subtotal + (v_product.price * v_qty);
  END LOOP;

  IF v_subtotal <= 0 THEN
    RAISE EXCEPTION 'EMPTY_CART';
  END IF;

  v_shipping_price := resolve_shipping_price(
    v_method.base_price,
    v_method.free_above,
    v_subtotal,
    v_cep,
    v_method.cep_rules
  );
  v_total := v_subtotal + v_shipping_price;

  INSERT INTO orders (
    user_id, status, subtotal, shipping_price, shipping_method_id, shipping_method_name,
    total, address_id, payment_status
  ) VALUES (
    p_user_id, 'pending', v_subtotal, v_shipping_price, v_method.id, v_method.name,
    v_total, p_address_id, 'pending'
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) AS t(value)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'quantity')::INT;

    SELECT * INTO v_product FROM products WHERE id = v_product_id FOR UPDATE;

    INSERT INTO order_items (order_id, product_id, quantity, unit_price)
    VALUES (v_order_id, v_product.id, v_qty, v_product.price);

    UPDATE products SET stock = stock - v_qty, updated_at = now() WHERE id = v_product.id;
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_order_id,
    'subtotal', v_subtotal,
    'shipping_price', v_shipping_price,
    'total', v_total,
    'shipping_method_name', v_method.name
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Cancelar pedido pendente e restaurar estoque
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cancel_order_and_restore_stock(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_item RECORD;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF v_order.status <> 'pending' OR v_order.payment_status = 'paid' THEN
    RETURN;
  END IF;

  FOR v_item IN
    SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id AND product_id IS NOT NULL
  LOOP
    UPDATE products SET stock = stock + v_item.quantity, updated_at = now()
    WHERE id = v_item.product_id;
  END LOOP;

  UPDATE orders
  SET status = 'cancelled', payment_status = 'cancelled', updated_at = now()
  WHERE id = p_order_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Confirmar pagamento (webhook)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION confirm_order_payment(
  p_order_id UUID,
  p_payment_method TEXT DEFAULT NULL,
  p_payout_transaction_id BIGINT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE orders
  SET
    status = 'confirmed',
    payment_status = 'paid',
    payment_method = COALESCE(p_payment_method, payment_method),
    payout_transaction_id = COALESCE(p_payout_transaction_id, payout_transaction_id),
    updated_at = now()
  WHERE id = p_order_id AND status = 'pending';
END;
$$;

REVOKE ALL ON FUNCTION create_checkout_order(UUID, UUID, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION cancel_order_and_restore_stock(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION confirm_order_payment(UUID, TEXT, BIGINT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION create_checkout_order(UUID, UUID, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION cancel_order_and_restore_stock(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION confirm_order_payment(UUID, TEXT, BIGINT) TO service_role;


-- ===== migration 202507020002_store_profile_merchant.sql =====

-- Perfil da loja (schema Store Google), devoluÃ§Ãµes Merchant e analytics

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS store_description TEXT;

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS store_street VARCHAR(200);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS store_street_number VARCHAR(20);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS store_complement VARCHAR(100);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS store_neighborhood VARCHAR(100);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS store_city VARCHAR(100);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS store_state VARCHAR(2);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS store_postal_code VARCHAR(10);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS store_country VARCHAR(2) NOT NULL DEFAULT 'BR';

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS store_opening_hours JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS return_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS return_days INT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS return_method VARCHAR(30) NOT NULL DEFAULT 'ReturnByMail';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS return_fees VARCHAR(40) NOT NULL DEFAULT 'FreeReturn';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS return_policy_page_slug VARCHAR(100);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS return_policy_notes TEXT;

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS seo_handling_days_min INT NOT NULL DEFAULT 1;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS seo_handling_days_max INT NOT NULL DEFAULT 2;

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS google_analytics_id VARCHAR(50);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS google_tag_manager_id VARCHAR(50);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS microsoft_clarity_id VARCHAR(50);

ALTER TABLE site_settings DROP CONSTRAINT IF EXISTS site_settings_return_method_check;
ALTER TABLE site_settings ADD CONSTRAINT site_settings_return_method_check
  CHECK (return_method IN ('ReturnByMail', 'ReturnInStore'));

ALTER TABLE site_settings DROP CONSTRAINT IF EXISTS site_settings_return_fees_check;
ALTER TABLE site_settings ADD CONSTRAINT site_settings_return_fees_check
  CHECK (return_fees IN ('FreeReturn', 'ReturnShippingFees', 'RestockingFees'));


-- ===== migration 202507020003_contact_messages.sql =====

-- Mensagens do formulÃ¡rio Fale Conosco

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL,
  phone VARCHAR(30),
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'read', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created
  ON contact_messages (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status
  ON contact_messages (status);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- InserÃ§Ã£o e leitura apenas via service role (API routes)

UPDATE site_settings
SET contact_page_href = '/fale-conosco'
WHERE contact_page_href IS NULL
   OR contact_page_href = ''
   OR contact_page_href = '/paginas/fale-conosco';


-- ===== migration 202507020004_footer_menus.sql =====

-- Menus configurÃ¡veis do rodapÃ© (separados das pÃ¡ginas CMS)

CREATE TABLE IF NOT EXISTS footer_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS footer_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES footer_menus(id) ON DELETE CASCADE,
  label VARCHAR(150) NOT NULL,
  href VARCHAR(300) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_footer_menus_sort
  ON footer_menus (sort_order)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_footer_menu_items_menu
  ON footer_menu_items (menu_id, sort_order)
  WHERE active = true;

ALTER TABLE footer_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE footer_menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "footer_menus_public_read" ON footer_menus;
DROP POLICY IF EXISTS "footer_menus_admin_all" ON footer_menus;
CREATE POLICY "footer_menus_public_read" ON footer_menus FOR SELECT USING (active = true);
CREATE POLICY "footer_menus_admin_all" ON footer_menus FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "footer_menu_items_public_read" ON footer_menu_items;
DROP POLICY IF EXISTS "footer_menu_items_admin_all" ON footer_menu_items;
CREATE POLICY "footer_menu_items_public_read" ON footer_menu_items FOR SELECT USING (
  active = true
  AND EXISTS (SELECT 1 FROM footer_menus m WHERE m.id = menu_id AND m.active = true)
);
CREATE POLICY "footer_menu_items_admin_all" ON footer_menu_items FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP TRIGGER IF EXISTS set_updated_at_footer_menus ON footer_menus;
CREATE TRIGGER set_updated_at_footer_menus
  BEFORE UPDATE ON footer_menus
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Migra colunas antigas (page_type) para menus, se ainda nÃ£o existirem menus
DO $$
DECLARE
  inst_id UUID;
  svc_id UUID;
  sup_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM footer_menus LIMIT 1) THEN
    INSERT INTO footer_menus (title, sort_order) VALUES ('Institucional', 0) RETURNING id INTO inst_id;
    INSERT INTO footer_menus (title, sort_order) VALUES ('ServiÃ§os', 1) RETURNING id INTO svc_id;
    INSERT INTO footer_menus (title, sort_order) VALUES ('Atendimento', 2) RETURNING id INTO sup_id;

    INSERT INTO footer_menu_items (menu_id, label, href, sort_order, active)
    SELECT inst_id, fp.title, '/paginas/' || fp.slug, COALESCE(fp.sort_order, 0), fp.active
    FROM footer_pages fp
    WHERE fp.page_type IN ('institutional', 'policy')
      AND fp.active = true
      AND COALESCE(fp.show_in_footer, true) = true
    ORDER BY fp.sort_order, fp.title;

    INSERT INTO footer_menu_items (menu_id, label, href, sort_order, active)
    SELECT svc_id, fp.title, '/paginas/' || fp.slug, COALESCE(fp.sort_order, 0), fp.active
    FROM footer_pages fp
    WHERE fp.page_type = 'services'
      AND fp.active = true
      AND COALESCE(fp.show_in_footer, true) = true
    ORDER BY fp.sort_order, fp.title;

    INSERT INTO footer_menu_items (menu_id, label, href, sort_order, active)
    SELECT sup_id, fp.title, '/paginas/' || fp.slug, COALESCE(fp.sort_order, 0), fp.active
    FROM footer_pages fp
    WHERE fp.page_type = 'support'
      AND fp.active = true
      AND COALESCE(fp.show_in_footer, true) = true
    ORDER BY fp.sort_order, fp.title;

    -- Link Fale Conosco dedicado (se existir rota)
    INSERT INTO footer_menu_items (menu_id, label, href, sort_order, active)
    SELECT sup_id, 'Fale Conosco', '/fale-conosco', 100, true
    WHERE NOT EXISTS (
      SELECT 1 FROM footer_menu_items
      WHERE menu_id = sup_id AND href = '/fale-conosco'
    );
  END IF;
END $$;


-- ===== migration 202507030001_payout_transactions.sql =====

-- Pagamento na loja: transaÃ§Ãµes Payout (Pix + cartÃ£o), desconto Pix, webhook dedup

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_document VARCHAR(14);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pix_qr_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pix_expiration TIMESTAMPTZ;

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS payment_checkout_config JSONB NOT NULL DEFAULT '{
  "pixEnabled": true,
  "pixDiscount": 0,
  "cardEnabled": true
}'::jsonb;

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_event_id TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  payload JSONB,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_payout_transaction ON orders(payout_transaction_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_order ON webhook_events(order_id);

-- ---------------------------------------------------------------------------
-- create_checkout_order com desconto (valor fixo ou % Pix sobre subtotal+frete)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_checkout_order(
  p_user_id UUID,
  p_address_id UUID,
  p_shipping_method_id UUID,
  p_items JSONB,
  p_discount_amount NUMERIC DEFAULT 0,
  p_pix_discount_percent NUMERIC DEFAULT 0
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_address addresses%ROWTYPE;
  v_item JSONB;
  v_product products%ROWTYPE;
  v_method shipping_methods%ROWTYPE;
  v_subtotal NUMERIC(10, 2) := 0;
  v_shipping_price NUMERIC(10, 2);
  v_discount NUMERIC(10, 2);
  v_total NUMERIC(10, 2);
  v_order_id UUID;
  v_qty INT;
  v_cep TEXT;
  v_product_id UUID;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'EMPTY_CART';
  END IF;

  SELECT * INTO v_address FROM addresses WHERE id = p_address_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ADDRESS_NOT_FOUND';
  END IF;

  v_cep := regexp_replace(COALESCE(v_address.zip_code, ''), '\D', '', 'g');
  IF length(v_cep) <> 8 THEN
    RAISE EXCEPTION 'INVALID_CEP';
  END IF;

  SELECT * INTO v_method FROM shipping_methods WHERE id = p_shipping_method_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SHIPPING_NOT_FOUND';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) AS t(value)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'quantity')::INT;

    IF v_product_id IS NULL OR v_qty IS NULL OR v_qty < 1 OR v_qty > 99 THEN
      RAISE EXCEPTION 'INVALID_ITEM';
    END IF;

    SELECT * INTO v_product FROM products WHERE id = v_product_id AND active = true FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
    END IF;

    IF v_product.stock < v_qty THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK';
    END IF;

    v_subtotal := v_subtotal + (v_product.price * v_qty);
  END LOOP;

  IF v_subtotal <= 0 THEN
    RAISE EXCEPTION 'EMPTY_CART';
  END IF;

  v_shipping_price := resolve_shipping_price(
    v_method.base_price,
    v_method.free_above,
    v_subtotal,
    v_cep,
    v_method.cep_rules
  );

  v_discount := GREATEST(COALESCE(p_discount_amount, 0), 0);

  IF COALESCE(p_pix_discount_percent, 0) > 0 THEN
    v_discount := ROUND((v_subtotal + v_shipping_price) * p_pix_discount_percent / 100, 2);
  END IF;

  v_total := GREATEST(v_subtotal + v_shipping_price - v_discount, 0.01);

  INSERT INTO orders (
    user_id, status, subtotal, shipping_price, shipping_method_id, shipping_method_name,
    discount_amount, total, address_id, payment_status
  ) VALUES (
    p_user_id, 'pending', v_subtotal, v_shipping_price, v_method.id, v_method.name,
    v_discount, v_total, p_address_id, 'pending'
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) AS t(value)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'quantity')::INT;

    SELECT * INTO v_product FROM products WHERE id = v_product_id FOR UPDATE;

    INSERT INTO order_items (order_id, product_id, quantity, unit_price)
    VALUES (v_order_id, v_product.id, v_qty, v_product.price);

    UPDATE products SET stock = stock - v_qty, updated_at = now() WHERE id = v_product.id;
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_order_id,
    'subtotal', v_subtotal,
    'shipping_price', v_shipping_price,
    'discount_amount', v_discount,
    'total', v_total,
    'shipping_method_name', v_method.name
  );
END;
$$;

REVOKE ALL ON FUNCTION create_checkout_order(UUID, UUID, UUID, JSONB, NUMERIC, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_checkout_order(UUID, UUID, UUID, JSONB, NUMERIC, NUMERIC) TO service_role;


-- ===== migration 202507030002_guest_checkout.sql =====

-- Checkout sem conta: pedidos guest, dados inline, token de acesso

ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_access_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_guest_access_token
  ON orders(guest_access_token)
  WHERE guest_access_token IS NOT NULL;

DROP FUNCTION IF EXISTS create_checkout_order(UUID, UUID, UUID, JSONB, NUMERIC, NUMERIC);

CREATE OR REPLACE FUNCTION create_checkout_order(
  p_shipping_method_id UUID,
  p_items JSONB,
  p_discount_amount NUMERIC DEFAULT 0,
  p_pix_discount_percent NUMERIC DEFAULT 0,
  p_user_id UUID DEFAULT NULL,
  p_address_id UUID DEFAULT NULL,
  p_customer JSONB DEFAULT NULL,
  p_shipping_address JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_address addresses%ROWTYPE;
  v_item JSONB;
  v_product products%ROWTYPE;
  v_method shipping_methods%ROWTYPE;
  v_subtotal NUMERIC(10, 2) := 0;
  v_shipping_price NUMERIC(10, 2);
  v_discount NUMERIC(10, 2);
  v_total NUMERIC(10, 2);
  v_order_id UUID;
  v_qty INT;
  v_cep TEXT;
  v_product_id UUID;
  v_customer_name TEXT;
  v_customer_email TEXT;
  v_customer_phone TEXT;
  v_shipping_json JSONB;
  v_guest_token TEXT;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'EMPTY_CART';
  END IF;

  IF p_user_id IS NOT NULL AND p_address_id IS NOT NULL THEN
    SELECT * INTO v_address FROM addresses WHERE id = p_address_id AND user_id = p_user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'ADDRESS_NOT_FOUND';
    END IF;

    v_cep := regexp_replace(COALESCE(v_address.zip_code, ''), '\D', '', 'g');
    v_shipping_json := jsonb_build_object(
      'street', v_address.street,
      'number', v_address.number,
      'complement', v_address.complement,
      'neighborhood', v_address.neighborhood,
      'city', v_address.city,
      'state', v_address.state,
      'zip_code', v_address.zip_code
    );
  ELSIF p_shipping_address IS NOT NULL AND p_customer IS NOT NULL THEN
    v_cep := regexp_replace(COALESCE(p_shipping_address->>'zip_code', ''), '\D', '', 'g');
    v_shipping_json := p_shipping_address;

    v_customer_name := NULLIF(trim(p_customer->>'name'), '');
    v_customer_email := NULLIF(trim(p_customer->>'email'), '');
    v_customer_phone := NULLIF(regexp_replace(COALESCE(p_customer->>'phone', ''), '\D', '', 'g'), '');

    IF v_customer_name IS NULL OR v_customer_email IS NULL OR v_customer_phone IS NULL THEN
      RAISE EXCEPTION 'CUSTOMER_INCOMPLETE';
    END IF;
  ELSE
    RAISE EXCEPTION 'ADDRESS_NOT_FOUND';
  END IF;

  IF length(v_cep) <> 8 THEN
    RAISE EXCEPTION 'INVALID_CEP';
  END IF;

  SELECT * INTO v_method FROM shipping_methods WHERE id = p_shipping_method_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SHIPPING_NOT_FOUND';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) AS t(value)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'quantity')::INT;

    IF v_product_id IS NULL OR v_qty IS NULL OR v_qty < 1 OR v_qty > 99 THEN
      RAISE EXCEPTION 'INVALID_ITEM';
    END IF;

    SELECT * INTO v_product FROM products WHERE id = v_product_id AND active = true FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
    END IF;

    IF v_product.stock < v_qty THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK';
    END IF;

    v_subtotal := v_subtotal + (v_product.price * v_qty);
  END LOOP;

  IF v_subtotal <= 0 THEN
    RAISE EXCEPTION 'EMPTY_CART';
  END IF;

  v_shipping_price := resolve_shipping_price(
    v_method.base_price,
    v_method.free_above,
    v_subtotal,
    v_cep,
    v_method.cep_rules
  );

  v_discount := GREATEST(COALESCE(p_discount_amount, 0), 0);

  IF COALESCE(p_pix_discount_percent, 0) > 0 THEN
    v_discount := ROUND((v_subtotal + v_shipping_price) * p_pix_discount_percent / 100, 2);
  END IF;

  v_total := GREATEST(v_subtotal + v_shipping_price - v_discount, 0.01);

  IF p_user_id IS NULL THEN
    v_guest_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  END IF;

  IF p_user_id IS NOT NULL AND p_address_id IS NOT NULL THEN
    INSERT INTO orders (
      user_id, status, subtotal, shipping_price, shipping_method_id, shipping_method_name,
      discount_amount, total, address_id, shipping_address, payment_status
    ) VALUES (
      p_user_id, 'pending', v_subtotal, v_shipping_price, v_method.id, v_method.name,
      v_discount, v_total, p_address_id, v_shipping_json, 'pending'
    )
    RETURNING id INTO v_order_id;
  ELSE
    INSERT INTO orders (
      user_id, status, subtotal, shipping_price, shipping_method_id, shipping_method_name,
      discount_amount, total, shipping_address,
      customer_name, customer_email, customer_phone, guest_access_token, payment_status
    ) VALUES (
      p_user_id, 'pending', v_subtotal, v_shipping_price, v_method.id, v_method.name,
      v_discount, v_total, v_shipping_json,
      v_customer_name, v_customer_email, v_customer_phone, v_guest_token, 'pending'
    )
    RETURNING id INTO v_order_id;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) AS t(value)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'quantity')::INT;

    SELECT * INTO v_product FROM products WHERE id = v_product_id FOR UPDATE;

    INSERT INTO order_items (order_id, product_id, quantity, unit_price)
    VALUES (v_order_id, v_product.id, v_qty, v_product.price);

    UPDATE products SET stock = stock - v_qty, updated_at = now() WHERE id = v_product.id;
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_order_id,
    'subtotal', v_subtotal,
    'shipping_price', v_shipping_price,
    'discount_amount', v_discount,
    'total', v_total,
    'shipping_method_name', v_method.name,
    'guest_access_token', v_guest_token
  );
END;
$$;

REVOKE ALL ON FUNCTION create_checkout_order(UUID, JSONB, NUMERIC, NUMERIC, UUID, UUID, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_checkout_order(UUID, JSONB, NUMERIC, NUMERIC, UUID, UUID, JSONB, JSONB) TO service_role;


-- ===== migration 202507031400_favicon_url.sql =====

-- Favicon configurÃ¡vel no painel admin
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS favicon_url TEXT;


-- ===== migration 202507031500_product_favorites.sql =====

-- Favoritos por usuÃ¡rio logado
CREATE TABLE IF NOT EXISTS product_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_favorites_user ON product_favorites(user_id);

ALTER TABLE product_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_favorites_own" ON product_favorites;
CREATE POLICY "product_favorites_own"
  ON product_favorites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ===== migration 202507111500_google_product_category.sql =====

-- Categoria do Google Shopping por produto (override manual do mapeamento automÃ¡tico)
-- Aceita ID numÃ©rico (ex.: "2271") OU caminho completo (ex.: "SaÃºde e beleza > Cuidados pessoais > CosmÃ©ticos")
ALTER TABLE products ADD COLUMN IF NOT EXISTS google_product_category VARCHAR(255);

COMMENT ON COLUMN products.google_product_category IS
  'Categoria de produto do Google Shopping (taxonomy-with-ids). ID ou caminho completo. Se vazio, o feed usa um mapeamento automÃ¡tico pela categoria da loja.';


-- ===== migration 202507111510_seo_audit_fixes.sql =====

-- Auditoria Google (misrepresentation policy) â€” correÃ§Ãµes de dados encontradas:
-- 1) Link do footer "Quem Somos" apontava para /quem-somos (404); rota real Ã© /paginas/quem-somos.
-- 2) Link "Ajuda" do topo apontava para /paginas/central-de-ajuda, pÃ¡gina que nunca existiu (404).
--    Redirecionado para /fale-conosco, pÃ¡gina de contato real e ativa.
-- 3) Typo no menu principal: "PreteÃ§Ã£o Solar" -> "ProteÃ§Ã£o Solar".
-- 4) seo_title_template/seo_description continham o placeholder padrÃ£o "Sua Loja" em vez do
--    nome real da loja â€” o <title> e a meta description de TODAS as pÃ¡ginas exibiam "Sua Loja".
-- 5) Link do Instagram apontava para "instagram.com/lojaexemplo" (conta de terceiros/placeholder,
--    nÃ£o pertence Ã  loja) â€” desativado para nÃ£o veicular identidade/afiliaÃ§Ã£o falsa.

UPDATE footer_menu_items SET href = '/paginas/quem-somos' WHERE href = '/quem-somos';

UPDATE site_settings
SET help_href = '/fale-conosco'
WHERE id = '00000000-0000-0000-0000-000000000001' AND help_href = '/paginas/central-de-ajuda';

UPDATE menu_items SET label = 'ProteÃ§Ã£o Solar' WHERE label = 'PreteÃ§Ã£o Solar';

UPDATE site_settings
SET
  seo_title_template = '%s | Atlas CosmÃ©ticos',
  seo_description = 'A Atlas CosmÃ©ticos Ã© uma loja virtual especializada em produtos de beleza e cuidados pessoais, com atendimento dedicado e compra 100% online.'
WHERE id = '00000000-0000-0000-0000-000000000001';

UPDATE social_links SET active = false WHERE href ILIKE '%lojaexemplo%';

-- 6) return_enabled estava false e return_days=7, mas a PolÃ­tica de Trocas e DevoluÃ§Ãµes
--    publicada promete 30 dias (art. 49 CDC). Corrige a config para refletir a mesma
--    informaÃ§Ã£o exibida ao cliente (fonte Ãºnica de verdade) e habilita o MerchantReturnPolicy
--    no schema.org / feed, hoje ausente.
UPDATE site_settings
SET return_enabled = true, return_days = 30, return_policy_page_slug = 'politica-de-trocas-e-devolucoes'
WHERE id = '00000000-0000-0000-0000-000000000001';


-- ===== migration 20260801191132_order_payment_proof_and_email.sql =====

-- Comprovante de pagamento Pix + rastreio de e-mail de confirmaÃ§Ã£o

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


-- ===== migration 20260804182524_store_analytics_ads_conversion.sql =====

-- Google Ads + conversÃ£o + campos de analytics ampliados

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS google_ads_id VARCHAR(50);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS google_ads_conversion_id VARCHAR(120);

-- Clarity pode receber snippet antes da normalizaÃ§Ã£o no app; amplia limite
ALTER TABLE site_settings ALTER COLUMN microsoft_clarity_id TYPE VARCHAR(2000);
ALTER TABLE site_settings ALTER COLUMN google_tag_manager_id TYPE VARCHAR(100);
ALTER TABLE site_settings ALTER COLUMN google_analytics_id TYPE VARCHAR(100);


-- ===== migration 20260804183306_track7_order_tracking.sql =====

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


-- ===== migration 20260809200000_shipping_promo_text.sql =====

-- Texto personalizÃ¡vel da barra "Frete grÃ¡tis para pedidos..."
ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS shipping_promo_text VARCHAR(200)
  NOT NULL DEFAULT 'Frete grÃ¡tis para pedidos acima de R$ 100';

COMMENT ON COLUMN site_settings.shipping_promo_text IS
  'Texto da barra de promoÃ§Ã£o de frete grÃ¡tis no topo do site';


-- ===== migration 20260825150000_fix_store_legal_identity.sql =====

-- Corrige identidade legal / contato da Atlas Cosmeticos (sem acentos em fantasia e razÃ£o social).
UPDATE site_settings
SET
  store_name = 'Atlas Cosmeticos',
  company_legal_name = 'ATLAS NEGOCIOS INTEGRADOS LTDA',
  cnpj = '67.006.230/0001-39',
  contact_email = 'atendimento@atlascosmeticos.com',
  contact_address = 'Avenida Portugal, 1148 - Quadra L29 Lote 1E Sala C2501 - Set. Marista - GoiÃ¢nia - GoiÃ¡s, CEP: 74150-030',
  store_street = 'Avenida Portugal',
  store_street_number = '1148',
  store_complement = 'Quadra L29 Lote 1E Sala C2501',
  store_neighborhood = 'Set. Marista',
  store_city = 'GoiÃ¢nia',
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
      'A Atlas Cosmeticos Ã© uma loja virtual especializada em produtos de beleza e cuidados pessoais, com atendimento dedicado e compra 100% online.'
    ),
    'Atlas CosmÃ©ticos',
    'Atlas Cosmeticos'
  )
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Normaliza menÃ§Ãµes com acento incorreto no conteÃºdo das pÃ¡ginas institucionais/polÃ­ticas.
UPDATE footer_pages
SET content = replace(content, 'Atlas CosmÃ©ticos', 'Atlas Cosmeticos')
WHERE content LIKE '%Atlas CosmÃ©ticos%';

UPDATE footer_pages
SET content = replace(content, 'ATLAS NEGÃ“CIOS INTEGRADOS LTDA', 'ATLAS NEGOCIOS INTEGRADOS LTDA')
WHERE content LIKE '%ATLAS NEGÃ“CIOS INTEGRADOS LTDA%';

