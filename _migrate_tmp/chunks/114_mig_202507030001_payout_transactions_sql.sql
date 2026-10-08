-- Pagamento na loja: transações Payout (Pix + cartão), desconto Pix, webhook dedup

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_document VARCHAR(14);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pix_qr_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pix_expiration TIMESTAMPTZ;

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS payment_checkout_config JSONB NOT NULL DEFAULT '{
  "pixEnabled": true,
  "pixDiscount": 0,
  "cardEnabled": true
}'::jsonb;

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_event_id TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  payload JSONB,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_payout_transaction ON orders(payout_transaction_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_order ON webhook_events(order_id);

-- ---------------------------------------------------------------------------
-- create_checkout_order com desconto (valor fixo ou % Pix sobre subtotal+frete)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_checkout_order(
  p_user_id UUID,
  p_address_id UUID,
  p_shipping_method_id UUID,
  p_items JSONB,
  p_discount_amount NUMERIC DEFAULT 0,
  p_pix_discount_percent NUMERIC DEFAULT 0
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
  v_discount NUMERIC(10, 2);
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

  v_discount := GREATEST(COALESCE(p_discount_amount, 0), 0);

  IF COALESCE(p_pix_discount_percent, 0) > 0 THEN
    v_discount := ROUND((v_subtotal + v_shipping_price) * p_pix_discount_percent / 100, 2);
  END IF;

  v_total := GREATEST(v_subtotal + v_shipping_price - v_discount, 0.01);

  INSERT INTO orders (
    user_id, status, subtotal, shipping_price, shipping_method_id, shipping_method_name,
    discount_amount, total, address_id, payment_status
  ) VALUES (
    p_user_id, 'pending', v_subtotal, v_shipping_price, v_method.id, v_method.name,
    v_discount, v_total, p_address_id, 'pending'
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
    'discount_amount', v_discount,
    'total', v_total,
    'shipping_method_name', v_method.name
  );
END;
$$;

REVOKE ALL ON FUNCTION create_checkout_order(UUID, UUID, UUID, JSONB, NUMERIC, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_checkout_order(UUID, UUID, UUID, JSONB, NUMERIC, NUMERIC) TO service_role;
