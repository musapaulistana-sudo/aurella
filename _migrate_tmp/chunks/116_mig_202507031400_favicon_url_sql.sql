-- Favicon configurável no painel admin
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS favicon_url TEXT;
