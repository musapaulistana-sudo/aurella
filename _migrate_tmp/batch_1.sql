-- FILE 01_parte_1_tabelas_sql.sql
-- =============================================================================
-- PARTE 1 — Tabelas (idempotente: pode rodar mesmo se layout já existir)
-- Rode no SQL Editor do Supabase
-- =============================================================================

-- Extensão UUID (já existe no Supabase, seguro rodar)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Layout / CMS (pule erros "already exists" se já criou nas migrations 001–003)
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
-- Catálogo
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
-- Usuários / perfis
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
-- Endereços, pedidos, itens
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
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'),
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


-- FILE 02_parte_2_seguranca_profiles_sql.sql
-- =============================================================================
-- PARTE 2 — Segurança de profiles (anti-escalação de role)
-- Pule se já aplicou — é idempotente
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

-- Impede INSERT manual em profiles (só trigger auth.users)
REVOKE INSERT ON profiles FROM authenticated, anon;


-- FILE 03_parte_3_rls_policies_sql.sql
-- =============================================================================
-- PARTE 3 — RLS em TODAS as tabelas + policies
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

-- ---------- order_items (via pedido do usuário) ----------
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


-- FILE 04_parte_4_storage_sql.sql
-- =============================================================================
-- PARTE 4 — Storage buckets + policies
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

-- Leitura pública
DROP POLICY IF EXISTS "storage_public_read" ON storage.objects;
CREATE POLICY "storage_public_read" ON storage.objects
  FOR SELECT USING (bucket_id IN ('product-images', 'categories', 'banners', 'site-assets'));

-- Upload/update/delete só admin
DROP POLICY IF EXISTS "storage_admin_write" ON storage.objects;
CREATE POLICY "storage_admin_write" ON storage.objects
  FOR ALL USING (
    bucket_id IN ('product-images', 'categories', 'banners', 'site-assets')
    AND is_admin()
  ) WITH CHECK (
    bucket_id IN ('product-images', 'categories', 'banners', 'site-assets')
    AND is_admin()
  );


-- FILE 05_parte_6_fix_signup_sql.sql
-- =============================================================================
-- PARTE 6 — Corrigir cadastro (trigger profiles + permissões)
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
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'),
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

-- Permissões para o Auth criar perfis via trigger
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.profiles TO supabase_auth_admin;
GRANT INSERT ON public.profiles TO postgres, supabase_auth_admin;

-- Garante INSERT apenas via trigger (não pelo cliente)
REVOKE INSERT ON public.profiles FROM authenticated, anon;

-- Policy explícita para o service role / auth admin inserir perfis
DROP POLICY IF EXISTS "profiles_insert_service" ON public.profiles;
CREATE POLICY "profiles_insert_service"
  ON public.profiles
  FOR INSERT
  TO supabase_auth_admin
  WITH CHECK (true);


-- FILE 06_parte_8_fix_admin_promotion_sql.sql
-- =============================================================================
-- PARTE 8 — Corrigir promoção a admin (trigger bloqueava SQL Editor)
--
-- O trigger prevent_role_self_escalation impedia QUALQUER mudança de role
-- quando auth.uid() não era admin — inclusive no SQL Editor (auth.uid() = NULL).
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

  -- Usuário comum não pode alterar o próprio role
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


-- FILE 07_parte_9_products_media_sql.sql
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


-- FILE 08_parte_10_payment_settings_sql.sql
-- =============================================================================
-- PARTE 10 — Configurações de parcelamento e pagamento (site_settings)
-- =============================================================================

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS installment_max INT NOT NULL DEFAULT 12;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS installment_interest_free INT NOT NULL DEFAULT 5;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS installment_min_value NUMERIC(10, 2) NOT NULL DEFAULT 5.00;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS installment_interest_rate NUMERIC(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS installment_text_free TEXT NOT NULL DEFAULT '{count}x de {value} sem juros';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS installment_text_interest TEXT NOT NULL DEFAULT '{count}x de {value} com juros';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS payment_methods JSONB NOT NULL DEFAULT '["visa","mastercard","elo","pix","boleto"]'::jsonb;
