INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer, meta_description)
VALUES (
  'quem-somos',
  'Quem Somos',
  'institutional',
  10,
  $content$<div class="entry-content single-content">
<h2>Quem Somos</h2>
<p>Bem-vindo Ã  <strong>Aurelle Cosmeticos</strong>.</p>
<p>A Aurelle Cosmeticos nasceu com o propÃ³sito de tornar o acesso a produtos de beleza, cuidados pessoais e bem-estar mais simples, seguro e fiÃ¡vel. Trabalhamos para oferecer uma experiÃªncia de compra online transparente, reunindo produtos de qualidade, atendimento dedicado e um processo de compra pensado para proporcionar praticidade do inÃ­cio ao fim.</p>
<p>Acreditamos que cuidar da beleza e da autoestima faz parte do dia a dia de cada pessoa. Por isso, disponibilizamos um catÃ¡logo diversificado, com produtos cuidadosamente selecionados para diferentes perfis, necessidades e rotinas de cuidados pessoais.</p>
<p>O nosso compromisso vai alÃ©m da venda. Valorizamos a relaÃ§Ã£o com os nossos clientes, oferecendo informaÃ§Ãµes claras sobre os produtos, preÃ§os transparentes (com IVA incluÃ­do), meios de pagamento seguros e acompanhamento dos pedidos em todas as etapas da compra.</p>
<p>A seguranÃ§a tambÃ©m Ã© uma prioridade. O nosso ambiente de compra utiliza tecnologias de proteÃ§Ã£o de dados e encriptaÃ§Ã£o, em conformidade com o Regulamento Geral sobre a ProteÃ§Ã£o de Dados (RGPD â€” Regulamento (UE) 2016/679) e demais legislaÃ§Ã£o portuguesa aplicÃ¡vel.</p>
<p>A Aurelle Cosmeticos Ã© operada por <strong>VOLUMEXATO - LDA</strong> (Sociedade por Quotas), com NIPC <strong>519621980</strong>, sede em Avenida Infante Dom Henrique 107, 2Âº Direito, Tercena, 2730-100 Barcarena, capital social de 10.000 â‚¬, matriculada na conservatÃ³ria do registo comercial sob o nipc 519621980.</p>
<h3>A Nossa MissÃ£o</h3>
<p>Oferecer produtos de beleza e cuidados pessoais com qualidade, seguranÃ§a e praticidade, proporcionando uma experiÃªncia de compra fiÃ¡vel e satisfatÃ³ria.</p>
<h3>A Nossa VisÃ£o</h3>
<p>Ser reconhecida como uma loja virtual de referÃªncia em confianÃ§a, atendimento e excelÃªncia na experiÃªncia de compra em Portugal.</p>
<h3>Os Nossos Valores</h3>
<ul>
<li>TransparÃªncia em todas as relaÃ§Ãµes com os nossos clientes;</li>
<li>Respeito aos direitos do consumidor;</li>
<li>Compromisso com a qualidade dos produtos e serviÃ§os;</li>
<li>SeguranÃ§a nas transaÃ§Ãµes e proteÃ§Ã£o das informaÃ§Ãµes pessoais;</li>
<li>Atendimento humanizado, eficiente e responsÃ¡vel;</li>
<li>Melhoria contÃ­nua dos processos e da experiÃªncia de compra;</li>
<li>Ã‰tica, responsabilidade e conformidade com a legislaÃ§Ã£o vigente.</li>
</ul>
</div>$content$,
  true,
  true,
  'ConheÃ§a a Aurelle Cosmeticos, operada pela VOLUMEXATO - LDA.'
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

INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer, meta_description)
VALUES (
  'fale-conosco',
  'Fale Conosco',
  'support',
  20,
  $content$<div class="entry-content single-content">
<h2>Fale Conosco</h2>
<p>Para questÃµes sobre encomendas, devoluÃ§Ãµes, privacidade ou informaÃ§Ãµes gerais, utilize o formulÃ¡rio disponÃ­vel em <a href="/fale-conosco">/fale-conosco</a> ou os contactos indicados no rodapÃ© do site.</p>
<p><strong>Nome comercial:</strong> Aurelle Cosmeticos</p>
<p><strong>Firma:</strong> VOLUMEXATO - LDA (Sociedade por Quotas)</p>
<p><strong>NIPC:</strong> 519621980</p>
<p><strong>Sede:</strong> Avenida Infante Dom Henrique 107, 2Âº Direito, Tercena, 2730-100 Barcarena</p>
<p><strong>Capital social:</strong> 10.000 â‚¬</p>
<p><strong>Registo comercial:</strong> Matriculada na ConservatÃ³ria do Registo Comercial sob o NIPC 519621980</p>
<p><strong>Contacto:</strong> utilize o formulÃ¡rio <a href="/fale-conosco">Fale Conosco</a> disponÃ­vel no site.</p>
<p><strong>HorÃ¡rio de atendimento:</strong> dias Ãºteis (conforme indicado no rodapÃ© do site). Mensagens enviadas fora do horÃ¡rio serÃ£o respondidas no prÃ³ximo dia Ãºtil.</p>
</div>$content$,
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

