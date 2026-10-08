-- P0: RLS seguro para pedidos + checkout transacional (sem INSERT direto pelo client)

-- ---------------------------------------------------------------------------
-- Colunas de checkout / pagamento
-- ---------------------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_price NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_method_id UUID REFERENCES shipping_methods(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_method_name VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) NOT NULL DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_checkout_id BIGINT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_secure_id VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_transaction_id BIGINT;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'refused', 'refunded', 'cancelled'));

-- ---------------------------------------------------------------------------
-- RLS ecommerce (idempotente) — pedidos SEM insert pelo client
-- ---------------------------------------------------------------------------
ALTER TABLE footer_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "footer_pages_public_read" ON footer_pages;
DROP POLICY IF EXISTS "footer_pages_admin_all" ON footer_pages;
CREATE POLICY "footer_pages_public_read" ON footer_pages FOR SELECT USING (active = true);
CREATE POLICY "footer_pages_admin_all" ON footer_pages FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "categories_public_read" ON categories;
DROP POLICY IF EXISTS "categories_admin_all" ON categories;
CREATE POLICY "categories_public_read" ON categories FOR SELECT USING (active = true);
CREATE POLICY "categories_admin_all" ON categories FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "products_public_read" ON products;
DROP POLICY IF EXISTS "products_admin_all" ON products;
CREATE POLICY "products_public_read" ON products FOR SELECT USING (active = true);
CREATE POLICY "products_admin_all" ON products FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "addresses_select_own" ON addresses;
DROP POLICY IF EXISTS "addresses_insert_own" ON addresses;
DROP POLICY IF EXISTS "addresses_update_own" ON addresses;
DROP POLICY IF EXISTS "addresses_delete_own" ON addresses;
DROP POLICY IF EXISTS "addresses_admin_all" ON addresses;
CREATE POLICY "addresses_select_own" ON addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "addresses_insert_own" ON addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "addresses_update_own" ON addresses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "addresses_delete_own" ON addresses FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "addresses_admin_all" ON addresses FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "orders_select_own" ON orders;
DROP POLICY IF EXISTS "orders_insert_own" ON orders;
DROP POLICY IF EXISTS "orders_admin_all" ON orders;
CREATE POLICY "orders_select_own" ON orders FOR SELECT USING (auth.uid() = user_id);
-- INSERT removido: pedidos só via RPC (service role)
CREATE POLICY "orders_admin_all" ON orders FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "order_items_select_own" ON order_items;
DROP POLICY IF EXISTS "order_items_insert_own" ON order_items;
DROP POLICY IF EXISTS "order_items_admin_all" ON order_items;
CREATE POLICY "order_items_select_own" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid())
);
-- INSERT removido: itens só via RPC
CREATE POLICY "order_items_admin_all" ON order_items FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE INDEX IF NOT EXISTS idx_orders_payout_checkout ON orders(payout_checkout_id);
CREATE INDEX IF NOT EXISTS idx_orders_payout_secure ON orders(payout_secure_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category ON product_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

-- ---------------------------------------------------------------------------
-- Frete (mesma lógica do app)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION resolve_shipping_price(
  p_base_price NUMERIC,
  p_free_above NUMERIC,
  p_subtotal NUMERIC,
  p_cep TEXT,
  p_cep_rules JSONB
) RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_price NUMERIC := COALESCE(p_base_price, 0);
  v_rule JSONB;
  v_prefix TEXT;
  v_matched NUMERIC;
BEGIN
  IF p_cep_rules IS NOT NULL AND jsonb_typeof(p_cep_rules) = 'array' THEN
    FOR v_rule IN SELECT value FROM jsonb_array_elements(p_cep_rules) AS t(value)
    LOOP
      IF v_rule ? 'prefixes' AND jsonb_typeof(v_rule->'prefixes') = 'array' THEN
        FOR v_prefix IN SELECT jsonb_array_elements_text(v_rule->'prefixes')
        LOOP
          IF p_cep LIKE v_prefix || '%' THEN
            v_matched := (v_rule->>'price')::NUMERIC;
            IF v_matched IS NOT NULL THEN
              v_price := v_matched;
            END IF;
            EXIT;
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  IF p_free_above IS NOT NULL AND p_subtotal >= p_free_above THEN
    RETURN 0;
  END IF;

  RETURN GREATEST(v_price, 0);
END;
$$;

-- ---------------------------------------------------------------------------
-- Criar pedido + decrementar estoque (transacional)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_checkout_order(
  p_user_id UUID,
  p_address_id UUID,
  p_shipping_method_id UUID,
  p_items JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_address addresses%ROWTYPE;
  v_item JSONB;
  v_product products%ROWTYPE;
  v_method shipping_methods%ROWTYPE;
  v_subtotal NUMERIC(10, 2) := 0;
  v_shipping_price NUMERIC(10, 2);
  v_total NUMERIC(10, 2);
  v_order_id UUID;
  v_qty INT;
  v_cep TEXT;
  v_product_id UUID;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'EMPTY_CART';
  END IF;

  SELECT * INTO v_address FROM addresses WHERE id = p_address_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ADDRESS_NOT_FOUND';
  END IF;

  v_cep := regexp_replace(COALESCE(v_address.zip_code, ''), '\D', '', 'g');
  IF length(v_cep) <> 8 THEN
    RAISE EXCEPTION 'INVALID_CEP';
  END IF;

  SELECT * INTO v_method FROM shipping_methods WHERE id = p_shipping_method_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SHIPPING_NOT_FOUND';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) AS t(value)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'quantity')::INT;

    IF v_product_id IS NULL OR v_qty IS NULL OR v_qty < 1 OR v_qty > 99 THEN
      RAISE EXCEPTION 'INVALID_ITEM';
    END IF;

    SELECT * INTO v_product FROM products WHERE id = v_product_id AND active = true FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
    END IF;

    IF v_product.stock < v_qty THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK';
    END IF;

    v_subtotal := v_subtotal + (v_product.price * v_qty);
  END LOOP;

  IF v_subtotal <= 0 THEN
    RAISE EXCEPTION 'EMPTY_CART';
  END IF;

  v_shipping_price := resolve_shipping_price(
    v_method.base_price,
    v_method.free_above,
    v_subtotal,
    v_cep,
    v_method.cep_rules
  );
  v_total := v_subtotal + v_shipping_price;

  INSERT INTO orders (
    user_id, status, subtotal, shipping_price, shipping_method_id, shipping_method_name,
    total, address_id, payment_status
  ) VALUES (
    p_user_id, 'pending', v_subtotal, v_shipping_price, v_method.id, v_method.name,
    v_total, p_address_id, 'pending'
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) AS t(value)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'quantity')::INT;

    SELECT * INTO v_product FROM products WHERE id = v_product_id FOR UPDATE;

    INSERT INTO order_items (order_id, product_id, quantity, unit_price)
    VALUES (v_order_id, v_product.id, v_qty, v_product.price);

    UPDATE products SET stock = stock - v_qty, updated_at = now() WHERE id = v_product.id;
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_order_id,
    'subtotal', v_subtotal,
    'shipping_price', v_shipping_price,
    'total', v_total,
    'shipping_method_name', v_method.name
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Cancelar pedido pendente e restaurar estoque
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cancel_order_and_restore_stock(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_item RECORD;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF v_order.status <> 'pending' OR v_order.payment_status = 'paid' THEN
    RETURN;
  END IF;

  FOR v_item IN
    SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id AND product_id IS NOT NULL
  LOOP
    UPDATE products SET stock = stock + v_item.quantity, updated_at = now()
    WHERE id = v_item.product_id;
  END LOOP;

  UPDATE orders
  SET status = 'cancelled', payment_status = 'cancelled', updated_at = now()
  WHERE id = p_order_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Confirmar pagamento (webhook)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION confirm_order_payment(
  p_order_id UUID,
  p_payment_method TEXT DEFAULT NULL,
  p_payout_transaction_id BIGINT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE orders
  SET
    status = 'confirmed',
    payment_status = 'paid',
    payment_method = COALESCE(p_payment_method, payment_method),
    payout_transaction_id = COALESCE(p_payout_transaction_id, payout_transaction_id),
    updated_at = now()
  WHERE id = p_order_id AND status = 'pending';
END;
$$;

REVOKE ALL ON FUNCTION create_checkout_order(UUID, UUID, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION cancel_order_and_restore_stock(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION confirm_order_payment(UUID, TEXT, BIGINT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION create_checkout_order(UUID, UUID, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION cancel_order_and_restore_stock(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION confirm_order_payment(UUID, TEXT, BIGINT) TO service_role;
