-- =============================================================================
-- PARTE 13 — Formas de frete (admin + calculadora)
-- =============================================================================

CREATE TABLE IF NOT EXISTS shipping_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  base_price NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (base_price >= 0),
  free_above NUMERIC(10, 2) CHECK (free_above IS NULL OR free_above >= 0),
  estimated_days_min INT CHECK (estimated_days_min IS NULL OR estimated_days_min >= 0),
  estimated_days_max INT CHECK (estimated_days_max IS NULL OR estimated_days_max >= 0),
  cep_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipping_methods_sort
  ON shipping_methods (sort_order)
  WHERE active = true;

DROP TRIGGER IF EXISTS set_updated_at_shipping_methods ON shipping_methods;
CREATE TRIGGER set_updated_at_shipping_methods
  BEFORE UPDATE ON shipping_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE shipping_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shipping_methods_public_read" ON shipping_methods;
DROP POLICY IF EXISTS "shipping_methods_admin_all" ON shipping_methods;

CREATE POLICY "shipping_methods_public_read"
  ON shipping_methods FOR SELECT USING (active = true);

CREATE POLICY "shipping_methods_admin_all"
  ON shipping_methods FOR ALL USING (is_admin()) WITH CHECK (is_admin());

INSERT INTO shipping_methods (name, description, base_price, free_above, estimated_days_min, estimated_days_max, sort_order)
SELECT 'PAC', 'Entrega econômica pelos Correios', 18.90, 199.00, 5, 12, 10
WHERE NOT EXISTS (SELECT 1 FROM shipping_methods LIMIT 1);

INSERT INTO shipping_methods (name, description, base_price, free_above, estimated_days_min, estimated_days_max, sort_order)
SELECT 'SEDEX', 'Entrega expressa', 32.90, 299.00, 2, 5, 20
WHERE NOT EXISTS (SELECT 1 FROM shipping_methods WHERE name = 'SEDEX');

INSERT INTO shipping_methods (name, description, base_price, free_above, estimated_days_min, estimated_days_max, sort_order)
SELECT 'Retirada na loja', 'Retire sem custo de frete', 0, NULL, 1, 2, 30
WHERE NOT EXISTS (SELECT 1 FROM shipping_methods WHERE name = 'Retirada na loja');
