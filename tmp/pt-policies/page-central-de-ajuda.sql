
INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer, meta_description)
VALUES (
  'central-de-ajuda',
  'Central de Ajuda',
  'support',
  10,
  '<div class="entry-content single-content">
<h2>Central de Ajuda</h2>
<p>Como podemos ajudar?</p>
<ul>
<li><a href="/paginas/politica-de-envio">Política de Envio</a> — prazos, custos e rastreio</li>
<li><a href="/paginas/politica-de-devolucao-e-reembolso">Devolução e Reembolso</a> — 14 dias de livre resolução</li>
<li><a href="/paginas/formas-de-pagamento">Formas de Pagamento</a></li>
<li><a href="/paginas/politica-de-privacidade">Política de Privacidade (RGPD)</a></li>
<li><a href="/paginas/informacoes-legais">Informações Legais</a> — firma, NIPC, Livro de Reclamações e RAL</li>
<li><a href="/fale-conosco">Fale Conosco</a></li>
<li><a href="/rastreio">Rastrear Encomenda</a></li>
</ul>
<p><a href="https://www.livroreclamacoes.pt/Inicio/" target="_blank" rel="noopener noreferrer">Livro de Reclamações Eletrónico</a></p>
</div>',
  true,
  true,
  'Central de Ajuda da Aurelle Cosmeticos.'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  page_type = EXCLUDED.page_type,
  sort_order = EXCLUDED.sort_order,
  content = EXCLUDED.content,
  active = true,
  show_in_footer = true,
  meta_description = EXCLUDED.meta_description,
  updated_at = now();
