INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer, meta_description)
VALUES (
  'resolucao-alternativa-litigios',
  'Resolução Alternativa de Litígios',
  'institutional',
  15,
  $content$<div class="entry-content single-content">
<h2>Resolução Alternativa de Litígios de Consumo (RAL)</h2>
<p>Nos termos da legislação portuguesa, informamos que, em caso de litígio de consumo, o consumidor pode recorrer a uma entidade de Resolução Alternativa de Litígios.</p>
<p>Pode consultar a lista atualizada de entidades RAL competentes no portal da Direção-Geral do Consumidor:</p>
<p><a href="https://www.consumidor.gov.pt" target="_blank" rel="noopener noreferrer">https://www.consumidor.gov.pt</a></p>
<p>Dispomos ainda de <a href="https://www.livroreclamacoes.pt/Inicio/" target="_blank" rel="noopener noreferrer">Livro de Reclamações Eletrónico</a>.</p>
<p><em>A plataforma europeia ODR foi descontinuada em 2025; por esse motivo, não disponibilizamos essa ligação.</em></p>
<p><strong>Nome comercial:</strong> Aurelle Cosmeticos</p>
<p><strong>Firma:</strong> VOLUMEXATO - LDA (Sociedade por Quotas)</p>
<p><strong>NIPC:</strong> 519621980</p>
<p><strong>Sede:</strong> Avenida Infante Dom Henrique 107, 2º Direito, Tercena, 2730-100 Barcarena</p>
<p><strong>Capital social:</strong> 10.000 €</p>
<p><strong>Registo comercial:</strong> Matriculada na Conservatória do Registo Comercial sob o NIPC 519621980</p>
<p><strong>Contacto:</strong> utilize o formulário <a href="/fale-conosco">Fale Conosco</a> disponível no site.</p>
</div>$content$,
  true,
  true,
  'Informação sobre entidades RAL de consumo em Portugal.'
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
