-- Ícones das formas de pagamento (vinculados às opções em site_settings.payment_methods)
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS payment_method_images JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Endereço no rodapé
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_address TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_address_label VARCHAR(100) DEFAULT 'Endereço';
