-- =============================================================================
-- PARTE 5 — Seed layout (só insere se ainda não existir)
-- =============================================================================

INSERT INTO policy_links (label, href, sort_order)
SELECT v.label, v.href, v.sort_order
FROM (VALUES
  ('Este site é seguro?', '/paginas/site-seguro', 1),
  ('Quem somos', '/paginas/quem-somos', 2),
  ('Central de ajuda', '/paginas/central-de-ajuda', 3)
) AS v(label, href, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM policy_links LIMIT 1);

INSERT INTO social_links (type, href, label, display, sort_order)
SELECT v.type, v.href, v.label, v.display, v.sort_order
FROM (VALUES
  ('whatsapp'::varchar, 'https://wa.me/5511999990000', 'WhatsApp', 'WhatsApp (11) 99999-0000', 1),
  ('facebook', 'https://facebook.com/lojaexemplo', 'Facebook', NULL::text, 2),
  ('instagram', 'https://instagram.com/lojaexemplo', 'Instagram', NULL::text, 3)
) AS v(type, href, label, display, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM social_links s WHERE s.type = v.type
);

INSERT INTO menu_items (label, slug, href, has_dropdown, sort_order)
SELECT v.label, v.slug, v.href, v.has_dropdown, v.sort_order
FROM (VALUES
  ('Compre por Marca', 'marcas', '/colecoes/marcas', true, 1),
  ('Categoria A', 'categoria-a', '/colecoes/categoria-a', false, 2),
  ('Categoria B', 'categoria-b', '/colecoes/categoria-b', false, 3),
  ('Categoria C', 'categoria-c', '/colecoes/categoria-c', false, 4),
  ('Categoria D', 'categoria-d', '/colecoes/categoria-d', false, 5),
  ('Categoria E', 'categoria-e', '/colecoes/categoria-e', false, 6),
  ('Categoria F', 'categoria-f', '/colecoes/categoria-f', false, 7),
  ('Outros', 'outros', '/colecoes/outros', false, 8),
  ('Categoria G', 'categoria-g', '/colecoes/categoria-g', false, 9)
) AS v(label, slug, href, has_dropdown, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM menu_items LIMIT 1);

-- Promover seu usuário a admin (TROQUE O E-MAIL)
-- IMPORTANTE: rode PARTE_8_fix_admin_promotion.sql ANTES se a promoção não funcionar
-- INSERT INTO public.profiles (id, name, role)
-- SELECT u.id, COALESCE(u.raw_user_meta_data->>'name', 'Admin'), 'admin'
-- FROM auth.users u WHERE lower(u.email) = lower('seu@email.com')
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';
