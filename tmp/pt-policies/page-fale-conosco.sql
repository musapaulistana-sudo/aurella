
INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer, meta_description)
VALUES (
  'fale-conosco',
  'Fale Conosco',
  'support',
  20,
  '<div class="entry-content single-content">
<h2>Fale Conosco</h2>
<p>Para questões sobre encomendas, devoluções, privacidade ou informações gerais, utilize o formulário disponível em <a href="/fale-conosco">/fale-conosco</a> ou os contactos indicados no rodapé do site.</p>
<p><strong>Nome comercial:</strong> Aurelle Cosmeticos</p>
<p><strong>Firma:</strong> VOLUMEXATO - LDA (Sociedade por Quotas)</p>
<p><strong>NIPC:</strong> 519621980</p>
<p><strong>Sede:</strong> Avenida Infante Dom Henrique 107, 2º Direito, Tercena, 2730-100 Barcarena</p>
<p><strong>Capital social:</strong> 10.000 €</p>
<p><strong>Registo comercial:</strong> Matriculada na Conservatória do Registo Comercial sob o NIPC 519621980</p>
<p><strong>Contacto:</strong> utilize o formulário <a href="/fale-conosco">Fale Conosco</a> disponível no site.</p>
<p><strong>Horário de atendimento:</strong> dias úteis (conforme indicado no rodapé do site). Mensagens enviadas fora do horário serão respondidas no próximo dia útil.</p>
</div>',
  true,
  true,
  'Contacte a Aurelle Cosmeticos.'
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
