-- Formas de frete configuráveis no admin

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
