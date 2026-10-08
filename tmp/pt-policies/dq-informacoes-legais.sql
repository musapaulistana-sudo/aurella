INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer, meta_description)
VALUES (
  'informacoes-legais',
  'Informações Legais',
  'institutional',
  5,
  $content$<div class="entry-content single-content">
<h2>Informações Legais</h2>
<p>Em cumprimento do Decreto-Lei n.º 7/2004 (comércio eletrónico) e do artigo 171.º do Código das Sociedades Comerciais, disponibilizamos a seguinte informação:</p>
<p><strong>Nome comercial:</strong> Aurelle Cosmeticos</p>
<p><strong>Firma:</strong> VOLUMEXATO - LDA (Sociedade por Quotas)</p>
<p><strong>NIPC:</strong> 519621980</p>
<p><strong>Sede:</strong> Avenida Infante Dom Henrique 107, 2º Direito, Tercena, 2730-100 Barcarena</p>
<p><strong>Capital social:</strong> 10.000 €</p>
<p><strong>Registo comercial:</strong> Matriculada na Conservatória do Registo Comercial sob o NIPC 519621980</p>
<p><strong>Contacto:</strong> utilize o formulário <a href="/fale-conosco">Fale Conosco</a> disponível no site.</p>
<hr>
<h3>Livro de Reclamações Eletrónico</h3>
<p>Nos termos da legislação portuguesa, dispomos de Livro de Reclamações Eletrónico:</p>
<p><a href="https://www.livroreclamacoes.pt/Inicio/" target="_blank" rel="noopener noreferrer">Livro de Reclamações Eletrónico</a></p>
<hr>
<h3>Resolução Alternativa de Litígios (RAL)</h3>
<p>Em caso de litígio de consumo, o consumidor pode recorrer a uma entidade de Resolução Alternativa de Litígios de consumo.</p>
<p>Pode consultar a lista de entidades RAL competentes no portal do consumidor da Direção-Geral do Consumidor:</p>
<p><a href="https://www.consumidor.gov.pt" target="_blank" rel="noopener noreferrer">www.consumidor.gov.pt</a></p>
<p><em>Nota: a plataforma europeia ODR foi descontinuada em 2025.</em></p>
<p>Última atualização: outubro de 2026</p>
</div>$content$,
  true,
  true,
  'Identificação legal da VOLUMEXATO - LDA, operadora da Aurelle Cosmeticos.'
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
