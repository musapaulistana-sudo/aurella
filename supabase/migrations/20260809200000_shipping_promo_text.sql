-- Texto personalizável da barra "Frete grátis para pedidos..."
ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS shipping_promo_text VARCHAR(200)
  NOT NULL DEFAULT 'Frete grátis para pedidos acima de R$ 100';

COMMENT ON COLUMN site_settings.shipping_promo_text IS
  'Texto da barra de promoção de frete grátis no topo do site';
