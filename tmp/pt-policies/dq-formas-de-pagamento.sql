INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer, meta_description)
VALUES (
  'formas-de-pagamento',
  'Formas de Pagamento',
  'services',
  30,
  $content$<div class="entry-content single-content">
<h2>Formas de Pagamento</h2>
<p>Na <strong>Aurelle Cosmeticos</strong>, os preços são apresentados em <strong>euros (EUR) com IVA incluído</strong>. Os custos de envio são mostrados antes da conclusão da compra.</p>
<p>As formas de pagamento disponíveis são as apresentadas no checkout no momento da compra e podem incluir, conforme configuração da loja:</p>
<ul>
<li>Cartão de crédito ou débito;</li>
<li>MB Way;</li>
<li>Referência Multibanco;</li>
<li>Outros métodos disponibilizados pelo intermediário de pagamento.</li>
</ul>
<p>A encomenda só é processada após a confirmação do pagamento. Dados completos de cartão não são armazenados nos nossos servidores.</p>
<p>Em caso de dúvidas, utilize o <a href="/fale-conosco">Fale Conosco</a>.</p>
</div>$content$,
  true,
  true,
  'Formas de pagamento aceites na Aurelle Cosmeticos.'
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
