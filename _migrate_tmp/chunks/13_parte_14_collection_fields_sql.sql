-- PARTE 14 — Campos de coleção em categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS banner_image_url TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS seal_image_url TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS page_title VARCHAR(200);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;
