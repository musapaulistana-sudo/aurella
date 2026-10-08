-- =============================================================================
-- PARTE 10 — Configurações de parcelamento e pagamento (site_settings)
-- =============================================================================

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS installment_max INT NOT NULL DEFAULT 12;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS installment_interest_free INT NOT NULL DEFAULT 5;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS installment_min_value NUMERIC(10, 2) NOT NULL DEFAULT 5.00;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS installment_interest_rate NUMERIC(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS installment_text_free TEXT NOT NULL DEFAULT '{count}x de {value} sem juros';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS installment_text_interest TEXT NOT NULL DEFAULT '{count}x de {value} com juros';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS payment_methods JSONB NOT NULL DEFAULT '["visa","mastercard","elo","pix","boleto"]'::jsonb;
