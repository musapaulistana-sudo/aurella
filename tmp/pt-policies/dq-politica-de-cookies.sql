INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer, meta_description)
VALUES (
  'politica-de-cookies',
  'Política de Cookies',
  'policy',
  25,
  $content$<div class="entry-content single-content">
<h2>Política de Cookies</h2>
<p><strong>Última atualização:</strong> outubro de 2026</p>
<p>A presente Política de Cookies explica como a <strong>VOLUMEXATO - LDA</strong>, NIPC <strong>519621980</strong>, utiliza cookies e tecnologias semelhantes durante a navegação no site da <strong>Aurelle Cosmeticos</strong>.</p>
<p>Este documento complementa a nossa Política de Privacidade e está em conformidade com o RGPD, a Lei n.º 58/2019 e a legislação portuguesa aplicável a comunicações eletrónicas e cookies.</p>
<p>Ao aceder ao nosso site, determinados cookies poderão ser armazenados no seu dispositivo para garantir o funcionamento adequado da plataforma, melhorar a experiência de navegação e possibilitar a prestação dos serviços oferecidos.</p>
<hr>
<h3>1. O que são Cookies?</h3>
<p>Cookies são pequenos ficheiros de texto armazenados no seu computador, smartphone ou outro dispositivo quando visita um website.</p>
<p>Permitem reconhecer determinadas informações da navegação, manter sessões ativas, recordar preferências e garantir o correto funcionamento de funcionalidades essenciais, como o carrinho de compras, o login e a finalização de encomendas.</p>
<p>Os cookies não acedem a ficheiros pessoais do utilizador nem executam programas ou códigos maliciosos no dispositivo.</p>
<hr>
<h3>2. Finalidade da Utilização dos Cookies</h3>
<p>Os cookies utilizados pela Aurelle Cosmeticos possuem finalidades específicas, entre elas:</p>
<ul>
<li>Garantir o funcionamento técnico e seguro da plataforma;</li>
<li>Manter sessões autenticadas durante a navegação;</li>
<li>Permitir o funcionamento do carrinho de compras e do checkout;</li>
<li>Memorizar preferências de navegação;</li>
<li>Medir desempenho e estabilidade do site;</li>
<li>Identificar oportunidades de melhoria na experiência do utilizador;</li>
<li>Medir campanhas publicitárias e marketing digital, quando autorizado.</li>
</ul>
<hr>
<h3>3. Categorias de Cookies</h3>
<h4>3.1 Cookies Essenciais</h4>
<p>São indispensáveis ao funcionamento da loja virtual e não podem ser desativados pelos nossos sistemas. Permitem autenticação, segurança, navegação, carrinho e conclusão da encomenda.</p>
<h4>3.2 Cookies de Desempenho</h4>
<p>Recolhem informações estatísticas sobre a utilização do site para identificar melhorias de desempenho, estabilidade e usabilidade.</p>
<h4>3.3 Cookies de Funcionalidade</h4>
<p>Permitem armazenar configurações escolhidas pelo utilizador, como idioma e preferências de navegação.</p>
<h4>3.4 Cookies de Marketing</h4>
<p>Podem ser utilizados para medir campanhas publicitárias, limitar a repetição de anúncios e apresentar conteúdos mais relevantes. Quando exigido pela legislação, estes cookies somente serão ativados após o consentimento do visitante.</p>
<hr>
<h3>4. Cookies de Terceiros</h3>
<p>O nosso site poderá utilizar serviços de parceiros especializados em análise de tráfego, processamento de pagamentos, prevenção de fraude, publicidade, segurança e integração com redes sociais. Esses fornecedores podem instalar cookies próprios, sendo responsáveis pelo tratamento das informações recolhidas.</p>
<hr>
<h3>5. Consentimento</h3>
<p>Sempre que exigido pela legislação aplicável, os cookies não essenciais somente serão utilizados após a manifestação livre, informada e inequívoca do utilizador através do banner de consentimento exibido na primeira visita ao site.</p>
<p>O consentimento poderá ser alterado ou revogado a qualquer momento.</p>
<hr>
<h3>6. Gestão dos Cookies</h3>
<p>O utilizador poderá configurar o seu navegador para aceitar, bloquear ou eliminar cookies a qualquer momento. A desativação dos cookies essenciais poderá comprometer o funcionamento da plataforma.</p>
<hr>
<h3>7. Proteção das Informações</h3>
<p>As informações eventualmente obtidas por meio de cookies são tratadas conforme a nossa Política de Privacidade e observam os princípios do RGPD.</p>
<hr>
<h3>8. Alterações desta Política</h3>
<p>Esta Política de Cookies poderá ser atualizada periodicamente. A versão vigente permanecerá sempre disponível no nosso site.</p>
<p>Em caso de dúvidas, utilize o formulário <a href="/fale-conosco">Fale Conosco</a>.</p>
</div>$content$,
  true,
  true,
  'Política de Cookies da Aurelle Cosmeticos.'
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
