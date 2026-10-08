INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer, meta_description)
VALUES (
  'quem-somos',
  'Quem Somos',
  'institutional',
  10,
  $content$<div class="entry-content single-content">
<h2>Quem Somos</h2>
<p>Bem-vindo à <strong>Aurelle Cosmeticos</strong>.</p>
<p>A Aurelle Cosmeticos nasceu com o propósito de tornar o acesso a produtos de beleza, cuidados pessoais e bem-estar mais simples, seguro e fiável. Trabalhamos para oferecer uma experiência de compra online transparente, reunindo produtos de qualidade, atendimento dedicado e um processo de compra pensado para proporcionar praticidade do início ao fim.</p>
<p>Acreditamos que cuidar da beleza e da autoestima faz parte do dia a dia de cada pessoa. Por isso, disponibilizamos um catálogo diversificado, com produtos cuidadosamente selecionados para diferentes perfis, necessidades e rotinas de cuidados pessoais.</p>
<p>O nosso compromisso vai além da venda. Valorizamos a relação com os nossos clientes, oferecendo informações claras sobre os produtos, preços transparentes (com IVA incluído), meios de pagamento seguros e acompanhamento dos pedidos em todas as etapas da compra.</p>
<p>A segurança também é uma prioridade. O nosso ambiente de compra utiliza tecnologias de proteção de dados e encriptação, em conformidade com o Regulamento Geral sobre a Proteção de Dados (RGPD — Regulamento (UE) 2016/679) e demais legislação portuguesa aplicável.</p>
<p>A Aurelle Cosmeticos é operada por <strong>VOLUMEXATO - LDA</strong> (Sociedade por Quotas), com NIPC <strong>519621980</strong>, sede em Avenida Infante Dom Henrique 107, 2º Direito, Tercena, 2730-100 Barcarena, capital social de 10.000 €, matriculada na conservatória do registo comercial sob o nipc 519621980.</p>
<h3>A Nossa Missão</h3>
<p>Oferecer produtos de beleza e cuidados pessoais com qualidade, segurança e praticidade, proporcionando uma experiência de compra fiável e satisfatória.</p>
<h3>A Nossa Visão</h3>
<p>Ser reconhecida como uma loja virtual de referência em confiança, atendimento e excelência na experiência de compra em Portugal.</p>
<h3>Os Nossos Valores</h3>
<ul>
<li>Transparência em todas as relações com os nossos clientes;</li>
<li>Respeito aos direitos do consumidor;</li>
<li>Compromisso com a qualidade dos produtos e serviços;</li>
<li>Segurança nas transações e proteção das informações pessoais;</li>
<li>Atendimento humanizado, eficiente e responsável;</li>
<li>Melhoria contínua dos processos e da experiência de compra;</li>
<li>Ética, responsabilidade e conformidade com a legislação vigente.</li>
</ul>
</div>$content$,
  true,
  true,
  'Conheça a Aurelle Cosmeticos, operada pela VOLUMEXATO - LDA.'
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
