INSERT INTO policy_links (label, href, sort_order) VALUES
  ('Este site é seguro?', '/paginas/site-seguro', 1),
  ('Quem somos', '/paginas/quem-somos', 2),
  ('Central de ajuda', '/paginas/central-de-ajuda', 3);

INSERT INTO social_links (type, href, label, display, sort_order) VALUES
  ('whatsapp', 'https://wa.me/5511999990000', 'WhatsApp', 'WhatsApp (11) 99999-0000', 1),
  ('facebook', 'https://facebook.com/lojaexemplo', 'Facebook', NULL, 2),
  ('instagram', 'https://instagram.com/lojaexemplo', 'Instagram', NULL, 3);

INSERT INTO menu_items (label, slug, href, has_dropdown, sort_order) VALUES
  ('Compre por Marca', 'marcas', '/colecoes/marcas', true, 1),
  ('Categoria A', 'categoria-a', '/colecoes/categoria-a', false, 2),
  ('Categoria B', 'categoria-b', '/colecoes/categoria-b', false, 3),
  ('Categoria C', 'categoria-c', '/colecoes/categoria-c', false, 4),
  ('Categoria D', 'categoria-d', '/colecoes/categoria-d', false, 5),
  ('Categoria E', 'categoria-e', '/colecoes/categoria-e', false, 6),
  ('Categoria F', 'categoria-f', '/colecoes/categoria-f', false, 7),
  ('Outros', 'outros', '/colecoes/outros', false, 8),
  ('Categoria G', 'categoria-g', '/colecoes/categoria-g', false, 9);
