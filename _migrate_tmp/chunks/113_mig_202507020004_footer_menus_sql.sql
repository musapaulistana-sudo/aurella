-- Menus configuráveis do rodapé (separados das páginas CMS)

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

-- Migra colunas antigas (page_type) para menus, se ainda não existirem menus
DO $$
DECLARE
  inst_id UUID;
  svc_id UUID;
  sup_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM footer_menus LIMIT 1) THEN
    INSERT INTO footer_menus (title, sort_order) VALUES ('Institucional', 0) RETURNING id INTO inst_id;
    INSERT INTO footer_menus (title, sort_order) VALUES ('Serviços', 1) RETURNING id INTO svc_id;
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
