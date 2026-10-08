-- SEO da loja e e-mail de contato no rodapé
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
    'Compre cosméticos e produtos de beleza na ' || store_name || '.'
  )
WHERE id = '00000000-0000-0000-0000-000000000001';
