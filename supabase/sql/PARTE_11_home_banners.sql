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
