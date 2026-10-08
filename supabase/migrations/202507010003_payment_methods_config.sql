-- Formas de pagamento configuráveis (nome + ícone por item)
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS payment_methods_config JSONB NOT NULL DEFAULT '[]'::jsonb;
