-- Google Ads + conversão + campos de analytics ampliados

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS google_ads_id VARCHAR(50);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS google_ads_conversion_id VARCHAR(120);

-- Clarity pode receber snippet antes da normalização no app; amplia limite
ALTER TABLE site_settings ALTER COLUMN microsoft_clarity_id TYPE VARCHAR(2000);
ALTER TABLE site_settings ALTER COLUMN google_tag_manager_id TYPE VARCHAR(100);
ALTER TABLE site_settings ALTER COLUMN google_analytics_id TYPE VARCHAR(100);
