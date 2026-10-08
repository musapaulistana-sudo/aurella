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
