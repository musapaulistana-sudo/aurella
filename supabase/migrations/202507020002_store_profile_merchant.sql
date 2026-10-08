-- Perfil da loja (schema Store Google), devoluções Merchant e analytics

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
