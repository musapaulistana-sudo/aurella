-- Auditoria Google (misrepresentation policy) — correções de dados encontradas:
-- 1) Link do footer "Quem Somos" apontava para /quem-somos (404); rota real é /paginas/quem-somos.
-- 2) Link "Ajuda" do topo apontava para /paginas/central-de-ajuda, página que nunca existiu (404).
--    Redirecionado para /fale-conosco, página de contato real e ativa.
-- 3) Typo no menu principal: "Preteção Solar" -> "Proteção Solar".
-- 4) seo_title_template/seo_description continham o placeholder padrão "Sua Loja" em vez do
--    nome real da loja — o <title> e a meta description de TODAS as páginas exibiam "Sua Loja".
-- 5) Link do Instagram apontava para "instagram.com/lojaexemplo" (conta de terceiros/placeholder,
--    não pertence à loja) — desativado para não veicular identidade/afiliação falsa.

UPDATE footer_menu_items SET href = '/paginas/quem-somos' WHERE href = '/quem-somos';

UPDATE site_settings
SET help_href = '/fale-conosco'
WHERE id = '00000000-0000-0000-0000-000000000001' AND help_href = '/paginas/central-de-ajuda';

UPDATE menu_items SET label = 'Proteção Solar' WHERE label = 'Preteção Solar';

UPDATE site_settings
SET
  seo_title_template = '%s | Atlas Cosméticos',
  seo_description = 'A Atlas Cosméticos é uma loja virtual especializada em produtos de beleza e cuidados pessoais, com atendimento dedicado e compra 100% online.'
WHERE id = '00000000-0000-0000-0000-000000000001';

UPDATE social_links SET active = false WHERE href ILIKE '%lojaexemplo%';

-- 6) return_enabled estava false e return_days=7, mas a Política de Trocas e Devoluções
--    publicada promete 30 dias (art. 49 CDC). Corrige a config para refletir a mesma
--    informação exibida ao cliente (fonte única de verdade) e habilita o MerchantReturnPolicy
--    no schema.org / feed, hoje ausente.
UPDATE site_settings
SET return_enabled = true, return_days = 30, return_policy_page_slug = 'politica-de-trocas-e-devolucoes'
WHERE id = '00000000-0000-0000-0000-000000000001';
