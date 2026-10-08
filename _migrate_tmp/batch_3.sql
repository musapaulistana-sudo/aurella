-- FILE 106_mig_202506170004_banner_device_target_sql.sql
-- Destino do banner: ambos os dispositivos, só desktop ou só mobile
ALTER TABLE home_banners
  ADD COLUMN IF NOT EXISTS device_target VARCHAR(20) NOT NULL DEFAULT 'both';

ALTER TABLE home_banners DROP CONSTRAINT IF EXISTS home_banners_device_target_check;
ALTER TABLE home_banners
  ADD CONSTRAINT home_banners_device_target_check
  CHECK (device_target IN ('both', 'desktop', 'mobile'));


-- FILE 107_mig_202507010001_seo_and_contact_email_sql.sql
-- SEO da loja e e-mail de contato no rodapé
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS seo_title VARCHAR(100);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS seo_title_template VARCHAR(100) DEFAULT '%s | Sua Loja';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS seo_description VARCHAR(300);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS seo_og_image_url TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_email VARCHAR(200);

UPDATE site_settings
SET
  seo_title = COALESCE(seo_title, store_name),
  seo_title_template = COALESCE(seo_title_template, '%s | ' || store_name),
  seo_description = COALESCE(
    seo_description,
    'Compre cosméticos e produtos de beleza na ' || store_name || '.'
  )
WHERE id = '00000000-0000-0000-0000-000000000001';


-- FILE 108_mig_202507010002_payment_method_images_and_address_sql.sql
-- Ícones das formas de pagamento (vinculados às opções em site_settings.payment_methods)
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS payment_method_images JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Endereço no rodapé
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_address TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_address_label VARCHAR(100) DEFAULT 'Endereço';


-- FILE 109_mig_202507010003_payment_methods_config_sql.sql
-- Formas de pagamento configuráveis (nome + ícone por item)
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS payment_methods_config JSONB NOT NULL DEFAULT '[]'::jsonb;


-- FILE 10_parte_12_footer_system_sql.sql
-- =============================================================================
-- PARTE 12 — Sistema de rodapé (páginas CMS, assets, configurações)
-- Execute após PARTE_1 e PARTE_3. Conteúdo idêntico à migration 202506170001.
-- =============================================================================

ALTER TABLE footer_pages ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
ALTER TABLE footer_pages ADD COLUMN IF NOT EXISTS show_in_footer BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE footer_pages ADD COLUMN IF NOT EXISTS meta_description VARCHAR(300);

ALTER TABLE footer_pages DROP CONSTRAINT IF EXISTS footer_pages_page_type_check;
ALTER TABLE footer_pages ADD CONSTRAINT footer_pages_page_type_check
  CHECK (page_type IN ('institutional', 'policy', 'services', 'support'));

CREATE INDEX IF NOT EXISTS idx_footer_pages_sort
  ON footer_pages (page_type, sort_order)
  WHERE active = true AND show_in_footer = true;

CREATE TABLE IF NOT EXISTS footer_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('payment', 'security')),
  image_url TEXT NOT NULL,
  alt_text VARCHAR(150),
  href VARCHAR(300),
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_footer_assets_type_sort
  ON footer_assets (asset_type, sort_order)
  WHERE active = true;

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS logo_image_url TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS cnpj VARCHAR(20);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS company_legal_name VARCHAR(200);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_phone_label VARCHAR(100) DEFAULT 'Ligue para nós';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS business_hours TEXT DEFAULT 'Seg. a sex., das 08h30 às 17h30.';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_whatsapp_label VARCHAR(50) DEFAULT 'WhatsApp';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_whatsapp_href VARCHAR(300);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_page_label VARCHAR(50) DEFAULT 'Fale Conosco';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_page_href VARCHAR(200) DEFAULT '/paginas/fale-conosco';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_social_heading VARCHAR(80) DEFAULT 'Siga a gente:';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_security_heading VARCHAR(80) DEFAULT 'Loja Segura';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_payment_text TEXT DEFAULT 'Pague em até {count}x sem juros com';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_security_text TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_disclaimers JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE footer_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "footer_assets_public_read" ON footer_assets;
DROP POLICY IF EXISTS "footer_assets_admin_all" ON footer_assets;

CREATE POLICY "footer_assets_public_read"
  ON footer_assets FOR SELECT USING (active = true);

CREATE POLICY "footer_assets_admin_all"
  ON footer_assets FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Seed de páginas (somente se a tabela estiver vazia)
INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer)
SELECT 'sobre-a-loja', 'Sobre a loja', 'institutional', 10, '<p>Conteúdo sobre a sua loja.</p>', true, true
WHERE NOT EXISTS (SELECT 1 FROM footer_pages LIMIT 1);

INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer)
SELECT 'central-de-ajuda', 'Central de Ajuda', 'support', 20, '<p>Como podemos ajudar?</p>', true, true
WHERE NOT EXISTS (SELECT 1 FROM footer_pages WHERE slug = 'central-de-ajuda');

INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer)
SELECT 'politica-de-privacidade', 'Política de Privacidade', 'policy', 30, '<p>Sua política de privacidade.</p>', true, true
WHERE NOT EXISTS (SELECT 1 FROM footer_pages WHERE slug = 'politica-de-privacidade');

INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer)
SELECT 'termo-de-uso', 'Termo de Uso', 'policy', 40, '<p>Termos de uso do site.</p>', true, true
WHERE NOT EXISTS (SELECT 1 FROM footer_pages WHERE slug = 'termo-de-uso');

INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer)
SELECT 'formas-de-pagamento', 'Formas de Pagamento', 'services', 10, '<p>Formas de pagamento aceitas.</p>', true, true
WHERE NOT EXISTS (SELECT 1 FROM footer_pages WHERE slug = 'formas-de-pagamento');

INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer)
SELECT 'prazo-e-entrega', 'Prazo e Entrega', 'services', 20, '<p>Informações sobre entrega.</p>', true, true
WHERE NOT EXISTS (SELECT 1 FROM footer_pages WHERE slug = 'prazo-e-entrega');

INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer)
SELECT 'frete-gratis', 'Frete Grátis', 'services', 30, '<p>Regras do frete grátis.</p>', true, true
WHERE NOT EXISTS (SELECT 1 FROM footer_pages WHERE slug = 'frete-gratis');

INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer)
SELECT 'trocas-e-devolucoes', 'Trocas e Devoluções', 'services', 40, '<p>Política de trocas.</p>', true, true
WHERE NOT EXISTS (SELECT 1 FROM footer_pages WHERE slug = 'trocas-e-devolucoes');

INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer)
SELECT 'fale-conosco', 'Fale Conosco', 'support', 30, '<p>Entre em contato conosco.</p>', true, true
WHERE NOT EXISTS (SELECT 1 FROM footer_pages WHERE slug = 'fale-conosco');

UPDATE site_settings SET
  footer_disclaimers = '[
    "Site Seguro e Blindado. Seus dados estão Protegidos. Garantimos a entrega do produto ou devolvemos seu dinheiro.",
    "Preços válidos são os informados no carrinho de compras",
    "* O frete grátis está sujeito ao peso, preço e distância do envio.",
    "* O valor mínimo para FRETE GRÁTIS pode variar entre os estados e você poderá verificar o frete no carrinho ao inserir seu CEP.",
    "Cupons de desconto são válidos enquanto ativos no sistema e podem ser desativados a qualquer momento, sem aviso prévio"
  ]'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000001'
  AND (footer_disclaimers IS NULL OR footer_disclaimers = '[]'::jsonb);


-- FILE 110_mig_202507020001_checkout_orders_security_sql.sql
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


-- FILE 111_mig_202507020002_store_profile_merchant_sql.sql
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


-- FILE 112_mig_202507020003_contact_messages_sql.sql
-- Mensagens do formulário Fale Conosco

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL,
  phone VARCHAR(30),
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'read', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created
  ON contact_messages (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status
  ON contact_messages (status);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Inserção e leitura apenas via service role (API routes)

UPDATE site_settings
SET contact_page_href = '/fale-conosco'
WHERE contact_page_href IS NULL
   OR contact_page_href = ''
   OR contact_page_href = '/paginas/fale-conosco';


-- FILE 113_mig_202507020004_footer_menus_sql.sql
-- Menus configuráveis do rodapé (separados das páginas CMS)

CREATE TABLE IF NOT EXISTS footer_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS footer_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES footer_menus(id) ON DELETE CASCADE,
  label VARCHAR(150) NOT NULL,
  href VARCHAR(300) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_footer_menus_sort
  ON footer_menus (sort_order)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_footer_menu_items_menu
  ON footer_menu_items (menu_id, sort_order)
  WHERE active = true;

ALTER TABLE footer_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE footer_menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "footer_menus_public_read" ON footer_menus;
DROP POLICY IF EXISTS "footer_menus_admin_all" ON footer_menus;
CREATE POLICY "footer_menus_public_read" ON footer_menus FOR SELECT USING (active = true);
CREATE POLICY "footer_menus_admin_all" ON footer_menus FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "footer_menu_items_public_read" ON footer_menu_items;
DROP POLICY IF EXISTS "footer_menu_items_admin_all" ON footer_menu_items;
CREATE POLICY "footer_menu_items_public_read" ON footer_menu_items FOR SELECT USING (
  active = true
  AND EXISTS (SELECT 1 FROM footer_menus m WHERE m.id = menu_id AND m.active = true)
);
CREATE POLICY "footer_menu_items_admin_all" ON footer_menu_items FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP TRIGGER IF EXISTS set_updated_at_footer_menus ON footer_menus;
CREATE TRIGGER set_updated_at_footer_menus
  BEFORE UPDATE ON footer_menus
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Migra colunas antigas (page_type) para menus, se ainda não existirem menus
DO $$
DECLARE
  inst_id UUID;
  svc_id UUID;
  sup_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM footer_menus LIMIT 1) THEN
    INSERT INTO footer_menus (title, sort_order) VALUES ('Institucional', 0) RETURNING id INTO inst_id;
    INSERT INTO footer_menus (title, sort_order) VALUES ('Serviços', 1) RETURNING id INTO svc_id;
    INSERT INTO footer_menus (title, sort_order) VALUES ('Atendimento', 2) RETURNING id INTO sup_id;

    INSERT INTO footer_menu_items (menu_id, label, href, sort_order, active)
    SELECT inst_id, fp.title, '/paginas/' || fp.slug, COALESCE(fp.sort_order, 0), fp.active
    FROM footer_pages fp
    WHERE fp.page_type IN ('institutional', 'policy')
      AND fp.active = true
      AND COALESCE(fp.show_in_footer, true) = true
    ORDER BY fp.sort_order, fp.title;

    INSERT INTO footer_menu_items (menu_id, label, href, sort_order, active)
    SELECT svc_id, fp.title, '/paginas/' || fp.slug, COALESCE(fp.sort_order, 0), fp.active
    FROM footer_pages fp
    WHERE fp.page_type = 'services'
      AND fp.active = true
      AND COALESCE(fp.show_in_footer, true) = true
    ORDER BY fp.sort_order, fp.title;

    INSERT INTO footer_menu_items (menu_id, label, href, sort_order, active)
    SELECT sup_id, fp.title, '/paginas/' || fp.slug, COALESCE(fp.sort_order, 0), fp.active
    FROM footer_pages fp
    WHERE fp.page_type = 'support'
      AND fp.active = true
      AND COALESCE(fp.show_in_footer, true) = true
    ORDER BY fp.sort_order, fp.title;

    -- Link Fale Conosco dedicado (se existir rota)
    INSERT INTO footer_menu_items (menu_id, label, href, sort_order, active)
    SELECT sup_id, 'Fale Conosco', '/fale-conosco', 100, true
    WHERE NOT EXISTS (
      SELECT 1 FROM footer_menu_items
      WHERE menu_id = sup_id AND href = '/fale-conosco'
    );
  END IF;
END $$;


-- FILE 114_mig_202507030001_payout_transactions_sql.sql
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


-- FILE 115_mig_202507030002_guest_checkout_sql.sql
-- Checkout sem conta: pedidos guest, dados inline, token de acesso

ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_access_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_guest_access_token
  ON orders(guest_access_token)
  WHERE guest_access_token IS NOT NULL;

DROP FUNCTION IF EXISTS create_checkout_order(UUID, UUID, UUID, JSONB, NUMERIC, NUMERIC);

CREATE OR REPLACE FUNCTION create_checkout_order(
  p_shipping_method_id UUID,
  p_items JSONB,
  p_discount_amount NUMERIC DEFAULT 0,
  p_pix_discount_percent NUMERIC DEFAULT 0,
  p_user_id UUID DEFAULT NULL,
  p_address_id UUID DEFAULT NULL,
  p_customer JSONB DEFAULT NULL,
  p_shipping_address JSONB DEFAULT NULL
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
  v_customer_name TEXT;
  v_customer_email TEXT;
  v_customer_phone TEXT;
  v_shipping_json JSONB;
  v_guest_token TEXT;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'EMPTY_CART';
  END IF;

  IF p_user_id IS NOT NULL AND p_address_id IS NOT NULL THEN
    SELECT * INTO v_address FROM addresses WHERE id = p_address_id AND user_id = p_user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'ADDRESS_NOT_FOUND';
    END IF;

    v_cep := regexp_replace(COALESCE(v_address.zip_code, ''), '\D', '', 'g');
    v_shipping_json := jsonb_build_object(
      'street', v_address.street,
      'number', v_address.number,
      'complement', v_address.complement,
      'neighborhood', v_address.neighborhood,
      'city', v_address.city,
      'state', v_address.state,
      'zip_code', v_address.zip_code
    );
  ELSIF p_shipping_address IS NOT NULL AND p_customer IS NOT NULL THEN
    v_cep := regexp_replace(COALESCE(p_shipping_address->>'zip_code', ''), '\D', '', 'g');
    v_shipping_json := p_shipping_address;

    v_customer_name := NULLIF(trim(p_customer->>'name'), '');
    v_customer_email := NULLIF(trim(p_customer->>'email'), '');
    v_customer_phone := NULLIF(regexp_replace(COALESCE(p_customer->>'phone', ''), '\D', '', 'g'), '');

    IF v_customer_name IS NULL OR v_customer_email IS NULL OR v_customer_phone IS NULL THEN
      RAISE EXCEPTION 'CUSTOMER_INCOMPLETE';
    END IF;
  ELSE
    RAISE EXCEPTION 'ADDRESS_NOT_FOUND';
  END IF;

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

  IF p_user_id IS NULL THEN
    v_guest_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  END IF;

  IF p_user_id IS NOT NULL AND p_address_id IS NOT NULL THEN
    INSERT INTO orders (
      user_id, status, subtotal, shipping_price, shipping_method_id, shipping_method_name,
      discount_amount, total, address_id, shipping_address, payment_status
    ) VALUES (
      p_user_id, 'pending', v_subtotal, v_shipping_price, v_method.id, v_method.name,
      v_discount, v_total, p_address_id, v_shipping_json, 'pending'
    )
    RETURNING id INTO v_order_id;
  ELSE
    INSERT INTO orders (
      user_id, status, subtotal, shipping_price, shipping_method_id, shipping_method_name,
      discount_amount, total, shipping_address,
      customer_name, customer_email, customer_phone, guest_access_token, payment_status
    ) VALUES (
      p_user_id, 'pending', v_subtotal, v_shipping_price, v_method.id, v_method.name,
      v_discount, v_total, v_shipping_json,
      v_customer_name, v_customer_email, v_customer_phone, v_guest_token, 'pending'
    )
    RETURNING id INTO v_order_id;
  END IF;

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
    'shipping_method_name', v_method.name,
    'guest_access_token', v_guest_token
  );
END;
$$;

REVOKE ALL ON FUNCTION create_checkout_order(UUID, JSONB, NUMERIC, NUMERIC, UUID, UUID, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_checkout_order(UUID, JSONB, NUMERIC, NUMERIC, UUID, UUID, JSONB, JSONB) TO service_role;


-- FILE 116_mig_202507031400_favicon_url_sql.sql
-- Favicon configurável no painel admin
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS favicon_url TEXT;


-- FILE 117_mig_202507031500_product_favorites_sql.sql
-- Favoritos por usuário logado
CREATE TABLE IF NOT EXISTS product_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_favorites_user ON product_favorites(user_id);

ALTER TABLE product_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_favorites_own" ON product_favorites;
CREATE POLICY "product_favorites_own"
  ON product_favorites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
