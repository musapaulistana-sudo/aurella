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
