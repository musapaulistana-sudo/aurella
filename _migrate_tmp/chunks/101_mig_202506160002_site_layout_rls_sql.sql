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
