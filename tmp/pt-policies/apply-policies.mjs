/**
 * Gera e aplica políticas PT-PT para Aurelle Cosmeticos / VOLUMEXATO - LDA
 * Conteúdo baseado nas políticas Reis (BR), adaptado a legislação portuguesa.
 */

const COMPANY = {
  brand: 'Aurelle Cosmeticos',
  firma: 'VOLUMEXATO - LDA',
  tipo: 'Sociedade por Quotas',
  nipc: '519621980',
  capital: '10.000 €',
  sede: 'Avenida Infante Dom Henrique 107, 2º Direito, Tercena, 2730-100 Barcarena',
  street: 'Avenida Infante Dom Henrique',
  number: '107',
  complement: '2º Direito',
  neighborhood: 'Tercena',
  city: 'Barcarena',
  state: 'Lisboa',
  postal: '2730-100',
  country: 'PT',
  registo: 'Matriculada na Conservatória do Registo Comercial sob o NIPC 519621980',
  livroReclamacoes: 'https://www.livroreclamacoes.pt/Inicio/',
  // Contactos: preencher quando disponíveis (obrigatórios para Merchant Center)
  email: null,
  phoneDisplay: null,
  phoneHref: null,
}

function contactBlock() {
  const lines = [
    `<p><strong>Nome comercial:</strong> ${COMPANY.brand}</p>`,
    `<p><strong>Firma:</strong> ${COMPANY.firma} (${COMPANY.tipo})</p>`,
    `<p><strong>NIPC:</strong> ${COMPANY.nipc}</p>`,
    `<p><strong>Sede:</strong> ${COMPANY.sede}</p>`,
    `<p><strong>Capital social:</strong> ${COMPANY.capital}</p>`,
    `<p><strong>Registo comercial:</strong> ${COMPANY.registo}</p>`,
  ]
  if (COMPANY.email) {
    lines.push(
      `<p><strong>E-mail:</strong> <a href="mailto:${COMPANY.email}">${COMPANY.email}</a></p>`
    )
  } else {
    lines.push(
      `<p><strong>Contacto:</strong> utilize o formulário <a href="/fale-conosco">Fale Conosco</a> disponível no site.</p>`
    )
  }
  if (COMPANY.phoneDisplay && COMPANY.phoneHref) {
    lines.push(
      `<p><strong>Telefone:</strong> <a href="${COMPANY.phoneHref}">${COMPANY.phoneDisplay}</a></p>`
    )
  }
  return lines.join('\n')
}

const pages = [
  {
    slug: 'informacoes-legais',
    title: 'Informações Legais',
    page_type: 'institutional',
    sort_order: 5,
    meta_description:
      'Identificação legal da VOLUMEXATO - LDA, operadora da Aurelle Cosmeticos.',
    content: `<div class="entry-content single-content">
<h2>Informações Legais</h2>
<p>Em cumprimento do Decreto-Lei n.º 7/2004 (comércio eletrónico) e do artigo 171.º do Código das Sociedades Comerciais, disponibilizamos a seguinte informação:</p>
${contactBlock()}
<hr>
<h3>Livro de Reclamações Eletrónico</h3>
<p>Nos termos da legislação portuguesa, dispomos de Livro de Reclamações Eletrónico:</p>
<p><a href="${COMPANY.livroReclamacoes}" target="_blank" rel="noopener noreferrer">Livro de Reclamações Eletrónico</a></p>
<hr>
<h3>Resolução Alternativa de Litígios (RAL)</h3>
<p>Em caso de litígio de consumo, o consumidor pode recorrer a uma entidade de Resolução Alternativa de Litígios de consumo.</p>
<p>Pode consultar a lista de entidades RAL competentes no portal do consumidor da Direção-Geral do Consumidor:</p>
<p><a href="https://www.consumidor.gov.pt" target="_blank" rel="noopener noreferrer">www.consumidor.gov.pt</a></p>
<p><em>Nota: a plataforma europeia ODR foi descontinuada em 2025.</em></p>
<p>Última atualização: outubro de 2026</p>
</div>`,
  },
  {
    slug: 'quem-somos',
    title: 'Quem Somos',
    page_type: 'institutional',
    sort_order: 10,
    meta_description: 'Conheça a Aurelle Cosmeticos, operada pela VOLUMEXATO - LDA.',
    content: `<div class="entry-content single-content">
<h2>Quem Somos</h2>
<p>Bem-vindo à <strong>${COMPANY.brand}</strong>.</p>
<p>A ${COMPANY.brand} nasceu com o propósito de tornar o acesso a produtos de beleza, cuidados pessoais e bem-estar mais simples, seguro e fiável. Trabalhamos para oferecer uma experiência de compra online transparente, reunindo produtos de qualidade, atendimento dedicado e um processo de compra pensado para proporcionar praticidade do início ao fim.</p>
<p>Acreditamos que cuidar da beleza e da autoestima faz parte do dia a dia de cada pessoa. Por isso, disponibilizamos um catálogo diversificado, com produtos cuidadosamente selecionados para diferentes perfis, necessidades e rotinas de cuidados pessoais.</p>
<p>O nosso compromisso vai além da venda. Valorizamos a relação com os nossos clientes, oferecendo informações claras sobre os produtos, preços transparentes (com IVA incluído), meios de pagamento seguros e acompanhamento dos pedidos em todas as etapas da compra.</p>
<p>A segurança também é uma prioridade. O nosso ambiente de compra utiliza tecnologias de proteção de dados e encriptação, em conformidade com o Regulamento Geral sobre a Proteção de Dados (RGPD — Regulamento (UE) 2016/679) e demais legislação portuguesa aplicável.</p>
<p>A ${COMPANY.brand} é operada por <strong>${COMPANY.firma}</strong> (${COMPANY.tipo}), com NIPC <strong>${COMPANY.nipc}</strong>, sede em ${COMPANY.sede}, capital social de ${COMPANY.capital}, ${COMPANY.registo.toLowerCase()}.</p>
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
</div>`,
  },
  {
    slug: 'politica-de-privacidade',
    title: 'Política de Privacidade',
    page_type: 'policy',
    sort_order: 20,
    meta_description: 'Política de Privacidade RGPD da Aurelle Cosmeticos.',
    content: `<div class="entry-content single-content">
<h2>Política de Privacidade</h2>
<p>Esta Política explica como a <strong>${COMPANY.brand}</strong>, operada por <strong>${COMPANY.firma}</strong>, trata dados pessoais de visitantes, clientes e utilizadores registados, em conformidade com o Regulamento Geral sobre a Proteção de Dados (RGPD — Regulamento (UE) 2016/679), a Lei n.º 58/2019 e demais normas aplicáveis.</p>
<ol>
<li><strong>RESPONSÁVEL PELO TRATAMENTO</strong><br>
${COMPANY.firma}, NIPC ${COMPANY.nipc}, sede em ${COMPANY.sede}.
</li>
<li><strong>QUE DADOS RECOLHEMOS</strong><br>
2.1 Fornecidos voluntariamente: nome, NIF (quando necessário para faturação), e-mail, telefone, morada de entrega e faturação, dados de login e conteúdo de mensagens enviadas ao atendimento.<br>
2.2 Recolhidos automaticamente: endereço IP, tipo de navegador, páginas acedidas, tempo de sessão, cookies e identificadores de dispositivo.<br>
2.3 Dados sensíveis: não solicitamos nem tratamos dados sensíveis na rotina da loja.
</li>
<li><strong>FINALIDADES DO TRATAMENTO</strong><br>
• Processar encomendas, pagamentos e entregas;<br>
• Emitir documentos fiscais e cumprir obrigações legais;<br>
• Prestar apoio e responder a solicitações;<br>
• Enviar comunicações sobre o estado das encomendas;<br>
• Enviar ofertas e novidades, quando houver consentimento;<br>
• Prevenir fraudes e garantir a segurança da plataforma;<br>
• Melhorar a navegação, o desempenho e a experiência do utilizador.
</li>
<li><strong>BASES LEGAIS (RGPD)</strong><br>
O tratamento fundamenta-se, conforme o caso, na execução de contrato, cumprimento de obrigação legal, interesses legítimos, consentimento do titular ou exercício de direitos em processo judicial ou administrativo.
</li>
<li><strong>PARTILHA COM TERCEIROS</strong><br>
Podemos partilhar dados, na medida necessária, com:<br>
• Processadores de pagamento;<br>
• Transportadoras e operadores logísticos;<br>
• Plataforma de e-commerce e alojamento;<br>
• Ferramentas de análise, marketing e publicidade (quando autorizado);<br>
• Contabilidade e assessoria fiscal.<br>
Não comercializamos bases de dados pessoais.
</li>
<li><strong>ARMAZENAMENTO E SEGURANÇA</strong><br>
Adotamos medidas técnicas e organizativas adequadas, incluindo ligação HTTPS, controlo de acessos e monitorização de incidentes. Os dados são conservados pelo prazo necessário às finalidades descritas e às exigências legais e fiscais.
</li>
<li><strong>DIREITOS DO TITULAR</strong><br>
Nos termos do RGPD, pode solicitar: acesso; retificação; apagamento; limitação do tratamento; portabilidade; oposição; e retirada do consentimento. Tem ainda o direito de apresentar reclamação à Comissão Nacional de Proteção de Dados (CNPD — <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">www.cnpd.pt</a>).
</li>
</ol>
<p>Para exercer os seus direitos, utilize o formulário <a href="/fale-conosco">Fale Conosco</a> ou os contactos indicados no rodapé do site.<br>
Assunto sugerido: “Privacidade de Dados — RGPD”.</p>
<ol start="8">
<li><strong>COOKIES</strong><br>
O uso de cookies e tecnologias semelhantes está detalhado na nossa <a href="/paginas/politica-de-cookies">Política de Cookies</a>.
</li>
<li><strong>DADOS DE PAGAMENTO</strong><br>
Dados completos de cartão não são armazenados nos nossos servidores. O processamento ocorre exclusivamente no ambiente do intermediário de pagamento.
</li>
<li><strong>LIGAÇÕES EXTERNAS</strong><br>
Não nos responsabilizamos pelas práticas de privacidade de sites de terceiros acedidos por ligações na nossa loja.
</li>
<li><strong>MENORES</strong><br>
Não direcionamos vendas a menores de 18 anos sem supervisão de responsável legal. Caso identifiquemos recolha indevida, adotaremos medidas para exclusão dos dados.
</li>
<li><strong>ALTERAÇÕES</strong><br>
Esta Política pode ser revista periodicamente. A versão atualizada será publicada nesta mesma URL.
</li>
</ol>
<h3>Dados da empresa e canais de atendimento</h3>
${contactBlock()}
<p>Última atualização: outubro de 2026</p>
</div>`,
  },
  {
    slug: 'politica-de-cookies',
    title: 'Política de Cookies',
    page_type: 'policy',
    sort_order: 25,
    meta_description: 'Política de Cookies da Aurelle Cosmeticos.',
    content: `<div class="entry-content single-content">
<h2>Política de Cookies</h2>
<p><strong>Última atualização:</strong> outubro de 2026</p>
<p>A presente Política de Cookies explica como a <strong>${COMPANY.firma}</strong>, NIPC <strong>${COMPANY.nipc}</strong>, utiliza cookies e tecnologias semelhantes durante a navegação no site da <strong>${COMPANY.brand}</strong>.</p>
<p>Este documento complementa a nossa Política de Privacidade e está em conformidade com o RGPD, a Lei n.º 58/2019 e a legislação portuguesa aplicável a comunicações eletrónicas e cookies.</p>
<p>Ao aceder ao nosso site, determinados cookies poderão ser armazenados no seu dispositivo para garantir o funcionamento adequado da plataforma, melhorar a experiência de navegação e possibilitar a prestação dos serviços oferecidos.</p>
<hr>
<h3>1. O que são Cookies?</h3>
<p>Cookies são pequenos ficheiros de texto armazenados no seu computador, smartphone ou outro dispositivo quando visita um website.</p>
<p>Permitem reconhecer determinadas informações da navegação, manter sessões ativas, recordar preferências e garantir o correto funcionamento de funcionalidades essenciais, como o carrinho de compras, o login e a finalização de encomendas.</p>
<p>Os cookies não acedem a ficheiros pessoais do utilizador nem executam programas ou códigos maliciosos no dispositivo.</p>
<hr>
<h3>2. Finalidade da Utilização dos Cookies</h3>
<p>Os cookies utilizados pela ${COMPANY.brand} possuem finalidades específicas, entre elas:</p>
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
</div>`,
  },
  {
    slug: 'termos-e-condicoes-de-uso',
    title: 'Termos e Condições de Uso',
    page_type: 'policy',
    sort_order: 30,
    meta_description: 'Termos e Condições de Uso da Aurelle Cosmeticos.',
    content: `<div class="entry-content single-content">
<h2>Termos e Condições de Uso</h2>
<p>Seja bem-vindo(a) ao site da <strong>${COMPANY.brand}</strong>. Ao aceder, navegar ou realizar compras na nossa loja virtual, o utilizador declara ter lido, compreendido e concordado integralmente com estes Termos e Condições de Uso.</p>
<p>Este documento foi elaborado em conformidade com o Decreto-Lei n.º 7/2004 (comércio eletrónico), o Decreto-Lei n.º 24/2014 (contratos celebrados à distância), o Decreto-Lei n.º 84/2021 (garantias de bens de consumo), o RGPD e demais normas aplicáveis em Portugal.</p>
<hr>
<h3>1. Identificação da Empresa</h3>
${contactBlock()}
<hr>
<h3>2. Aceitação dos Termos</h3>
<p>O uso do site implica aceitação plena destes Termos. Caso o utilizador não concorde, deverá interromper a navegação e não utilizar os serviços da plataforma.</p>
<p>A ${COMPANY.brand} poderá alterar estes Termos a qualquer momento, mantendo a versão atualizada disponível no site.</p>
<hr>
<h3>3. Finalidade do Site</h3>
<p>O site tem como finalidade disponibilizar informações sobre produtos cosméticos, dermocosméticos, perfumaria e cuidados pessoais, bem como viabilizar a venda online e oferecer apoio ao cliente.</p>
<p>As informações disponibilizadas não substituem orientação profissional especializada (médica, farmacêutica ou dermatológica).</p>
<hr>
<h3>4. Utilização do Site e Conduta do Utilizador</h3>
<p>O utilizador compromete-se a:</p>
<ul>
<li>Fornecer informações verdadeiras, completas e atualizadas;</li>
<li>Utilizar o site apenas para fins lícitos;</li>
<li>Respeitar direitos da empresa e de terceiros;</li>
<li>Não inserir códigos maliciosos nem tentar acesso indevido a sistemas;</li>
<li>Não praticar qualquer ato que comprometa o funcionamento da plataforma.</li>
</ul>
<hr>
<h3>5. Registo e Responsabilidades</h3>
<p>Para realizar compras, o utilizador poderá ser solicitado a criar uma conta, sendo responsável pela veracidade dos dados fornecidos e pela confidencialidade da palavra-passe.</p>
<hr>
<h3>6. Preços, Ofertas e Disponibilidade</h3>
<p>Os preços são apresentados em euros (EUR) com IVA incluído, salvo indicação em contrário. Os custos de envio são apresentados antes da conclusão da compra.</p>
<p>Os preços e condições comerciais podem ser alterados sem aviso prévio, respeitando-se sempre as encomendas já concluídas e pagas. As ofertas estão sujeitas à disponibilidade de stock.</p>
<p>Em caso de erro evidente de preço, falha sistémica ou indisponibilidade de produto, a empresa poderá cancelar a encomenda com reembolso integral.</p>
<hr>
<h3>7. Produtos Comercializados</h3>
<p>Os produtos comercializados seguem a legislação vigente aplicável ao setor de cosméticos e higiene pessoal. As informações de utilização, composição e advertências são fornecidas pelos fabricantes.</p>
<hr>
<h3>8. Pagamentos</h3>
<p>Os pagamentos são processados através das opções disponíveis no checkout. A encomenda será processada apenas após confirmação da instituição financeira. Encomendas não aprovadas, suspeitas ou inconsistentes poderão ser canceladas.</p>
<hr>
<h3>9. Entregas</h3>
<p>As condições de envio, prazos e responsabilidades estão descritas na <a href="/paginas/politica-de-envio">Política de Envio</a>.</p>
<hr>
<h3>10. Direito de Livre Resolução, Devoluções e Reembolsos</h3>
<p>As regras aplicáveis estão descritas nas políticas específicas, elaboradas em conformidade com o Decreto-Lei n.º 24/2014 e demais legislação de consumo.</p>
<hr>
<h3>11. Garantia Legal</h3>
<p>Nos termos do Decreto-Lei n.º 84/2021, os bens de consumo novos beneficiam de garantia legal de conformidade de <strong>3 (três) anos</strong>, contados a partir da entrega do bem, sem prejuízo de eventuais exclusões legalmente previstas (nomeadamente para produtos perecíveis ou sujeitos a regras específicas).</p>
<hr>
<h3>12. Privacidade e Proteção de Dados</h3>
<p>O tratamento de dados pessoais é realizado conforme o RGPD e a nossa <a href="/paginas/politica-de-privacidade">Política de Privacidade</a>.</p>
<hr>
<h3>13. Propriedade Intelectual</h3>
<p>Todo o conteúdo do site, incluindo textos, imagens, marcas e identidade visual, é protegido por direitos de propriedade intelectual. É proibida a reprodução ou utilização sem autorização expressa da empresa.</p>
<hr>
<h3>14. Limitação de Responsabilidade</h3>
<p>A ${COMPANY.brand} não se responsabiliza por utilização inadequada dos produtos, falhas de terceiros, indisponibilidade temporária do site ou eventos de força maior.</p>
<hr>
<h3>15. Livro de Reclamações e RAL</h3>
<p>Dispomos de <a href="${COMPANY.livroReclamacoes}" target="_blank" rel="noopener noreferrer">Livro de Reclamações Eletrónico</a>. Em caso de litígio de consumo, o consumidor pode recorrer a uma entidade de Resolução Alternativa de Litígios (consultar <a href="https://www.consumidor.gov.pt" target="_blank" rel="noopener noreferrer">www.consumidor.gov.pt</a>).</p>
<hr>
<h3>16. Legislação e Foro</h3>
<p>Estes Termos são regidos pela lei portuguesa. Para a resolução de litígios emergentes da interpretação ou execução destes Termos, é competente o foro da comarca da sede da empresa, sem prejuízo das normas imperativas de proteção do consumidor que estabeleçam foro diferente.</p>
<hr>
<h3>17. Atualizações</h3>
<p>Estes Termos podem ser alterados a qualquer momento. A versão vigente permanecerá sempre publicada no site.</p>
</div>`,
  },
  {
    slug: 'politica-de-envio',
    title: 'Política de Envio',
    page_type: 'services',
    sort_order: 10,
    meta_description: 'Prazos, custos e condições de envio da Aurelle Cosmeticos em Portugal.',
    content: `<div class="entry-content single-content">
<h1>Política de Envio e Entrega</h1>
<p>A <strong>${COMPANY.brand}</strong> realiza entregas em Portugal continental e Regiões Autónomas (quando disponível) através de transportadoras e operadores logísticos parceiros. Os países e zonas atendidos, bem como os custos, são apresentados no checkout antes da conclusão da compra.</p>
<hr>
<h2>1. Processamento das Encomendas</h2>
<p>Todas as encomendas passam por um prazo de até <strong>3 (três) dias úteis</strong> para separação, conferência e preparação para envio após a confirmação do pagamento.</p>
<p>As encomendas são processadas apenas em dias úteis, de segunda a sexta-feira, exceto feriados.</p>
<hr>
<h2>2. Prazo de Entrega</h2>
<p>Após o envio, o prazo estimado de entrega em Portugal continental é tipicamente de <strong>2 a 5 dias úteis</strong>, podendo variar conforme:</p>
<ul>
<li>Código postal de destino;</li>
<li>Disponibilidade logística da região;</li>
<li>Atuação da transportadora responsável;</li>
<li>Entregas para ilhas (Açores e Madeira), que podem ter prazos e custos adicionais.</li>
</ul>
<p>A previsão de entrega é informada durante o processo de compra e poderá ser consultada posteriormente em <strong>«As Minhas Encomendas»</strong>.</p>
<p><strong>Importante:</strong> Todos os prazos são contados em dias úteis, excluindo sábados, domingos e feriados.</p>
<hr>
<h2>3. Custo de Envio</h2>
<p>O valor do envio é calculado conforme a política vigente da loja e apresentado em euros (EUR) com IVA incluído, antes da conclusão da compra no checkout.</p>
<ul>
<li>Os custos e eventuais limiares de portes grátis são apresentados de forma clara no carrinho e no checkout;</li>
<li>Promoções de portes grátis podem variar conforme peso, valor e zona de entrega.</li>
</ul>
<hr>
<h2>4. Rastreamento da Encomenda</h2>
<p>Assim que a encomenda for expedida, o cliente poderá acompanhar as etapas da entrega em <strong>«As Minhas Encomendas»</strong> ou na página de rastreio, quando disponível. O código de rastreamento será informado após a postagem, sempre que aplicável.</p>
<hr>
<h2>5. Tentativas de Entrega</h2>
<p>As transportadoras podem realizar até <strong>3 (três) tentativas de entrega</strong> na morada informada.</p>
<p>Caso a entrega não seja concluída por ausência do destinatário, restrição de acesso ou outras impossibilidades, a encomenda poderá regressar ao nosso centro de distribuição. Nessas situações, poderá ser necessária a cobrança de um novo envio para reexpedição.</p>
<hr>
<h2>6. Morada de Entrega</h2>
<p>É responsabilidade do cliente informar corretamente os dados de entrega no momento da compra.</p>
<p>A ${COMPANY.brand} não se responsabiliza por atrasos ou devoluções decorrentes de:</p>
<ul>
<li>Morada incorreta;</li>
<li>Dados incompletos;</li>
<li>Ausência do destinatário;</li>
<li>Recusa injustificada do recebimento.</li>
</ul>
<hr>
<h2>7. Atrasos na Entrega</h2>
<p>Embora trabalhemos para cumprir os prazos informados, podem ocorrer atrasos decorrentes de fatores externos, tais como condições climáticas adversas, greves, restrições logísticas, problemas operacionais das transportadoras ou casos de força maior. Sempre que houver ocorrência que afete a entrega, a nossa equipa prestará o suporte necessário.</p>
<hr>
<h2>8. Extravio ou Avaria</h2>
<p>Caso a encomenda seja extraviada durante o transporte ou entregue com avarias comprovadas, a ${COMPANY.brand} realizará a análise da ocorrência. Após confirmação, poderá ser adotada uma das seguintes soluções:</p>
<ul>
<li>Reenvio do produto;</li>
<li>Troca da mercadoria;</li>
<li>Reembolso integral do valor pago, conforme a legislação aplicável.</li>
</ul>
</div>`,
  },
  {
    slug: 'politica-de-devolucao-e-reembolso',
    title: 'Política de Devolução e Reembolso',
    page_type: 'services',
    sort_order: 20,
    meta_description:
      'Direito de livre resolução (14 dias), devoluções e reembolsos — Aurelle Cosmeticos.',
    content: `<div class="entry-content single-content">
<h2>Política de Devolução e Reembolso</h2>
<p>A <strong>${COMPANY.brand}</strong> procura oferecer uma experiência de compra segura e transparente. Esta Política estabelece as condições para devoluções e reembolsos, em conformidade com o Decreto-Lei n.º 24/2014 (contratos celebrados à distância) e demais legislação de consumo em Portugal.</p>
<hr>
<h3>1. Direito de Livre Resolução (14 dias)</h3>
<p>Nas compras realizadas pela internet, o consumidor tem o direito de livre resolução do contrato no prazo de <strong>14 (catorze) dias</strong>, contados a partir do dia em que o consumidor ou um terceiro por si indicado (que não seja o transportador) adquira a posse física dos bens, sem necessidade de indicar qualquer motivo, nos termos do Decreto-Lei n.º 24/2014.</p>
<p>Para que a devolução seja aceite, o produto deverá ser devolvido preferencialmente:</p>
<ul>
<li>sem sinais de utilização incompatíveis com a natureza do bem (o consumidor pode manusear os bens na medida necessária para estabelecer a natureza, as características e o funcionamento);</li>
<li>na embalagem original, sempre que possível;</li>
<li>acompanhado da fatura ou comprovativo de compra;</li>
<li>com todos os acessórios, brindes e itens enviados junto à encomenda.</li>
</ul>
<p><strong>Nota sobre cosméticos:</strong> por razões de higiene e proteção da saúde, produtos selados que tenham sido abertos após a entrega podem não ser elegíveis para livre resolução, nos termos das exceções legais aplicáveis.</p>
<hr>
<h3>2. Quem paga o envio da devolução?</h3>
<ul>
<li><strong>Livre resolução (arrependimento):</strong> salvo indicação em contrário no momento da compra ou em promoção específica, os custos de devolução são da responsabilidade do consumidor;</li>
<li><strong>Produto com defeito, incorreto ou avariado por responsabilidade da loja:</strong> os custos de devolução/reenvio são suportados pela ${COMPANY.brand}.</li>
</ul>
<hr>
<h3>3. Morada de Devolução</h3>
<p>Salvo indicação diversa no momento da aprovação da devolução, as devoluções devem ser enviadas para:</p>
<p><strong>${COMPANY.firma}</strong><br>
${COMPANY.sede}<br>
NIPC ${COMPANY.nipc}</p>
<p>Não envie produtos sem autorização prévia da nossa equipa de atendimento.</p>
<hr>
<h3>4. Produto com Defeito ou Não Conformidade</h3>
<p>Caso o produto apresente defeito ou não conformidade, o cliente deverá contactar a nossa Central de Atendimento para análise. Nos termos do Decreto-Lei n.º 84/2021, os bens novos beneficiam de garantia legal de conformidade de <strong>3 (três) anos</strong>, sem prejuízo das regras específicas aplicáveis a cada categoria de produto.</p>
<p>Após confirmação, a ${COMPANY.brand} poderá proceder à substituição, reparação (quando aplicável), crédito para nova compra ou reembolso, conforme a legislação e a disponibilidade do artigo.</p>
<hr>
<h3>5. Produto Incorreto ou Avariado</h3>
<p>Se o cliente receber um produto diferente do adquirido ou identificar avarias causadas durante o transporte, deverá comunicar o ocorrido preferencialmente em até <strong>14 dias</strong> após o recebimento, com fotografias da embalagem e do produto sempre que possível.</p>
<hr>
<h3>6. Quando Recusar a Entrega</h3>
<p>Recomendamos que o recebimento seja recusado caso seja constatada:</p>
<ul>
<li>embalagem violada ou aberta;</li>
<li>produto visivelmente danificado;</li>
<li>encomenda em desacordo com a compra realizada;</li>
<li>falta de itens que deveriam acompanhar o produto.</li>
</ul>
<hr>
<h3>7. Procedimento para Devolução</h3>
<p>Após a aprovação da solicitação, a nossa equipa fornecerá as orientações para devolução. O produto passará por conferência após o recebimento. Constatado o cumprimento das condições desta política, daremos continuidade ao processo de troca ou reembolso.</p>
<hr>
<h3>8. Prazo e Forma de Reembolso</h3>
<p>Após a receção dos bens devolvidos (ou prova de devolução, quando aplicável) e aprovação da análise, o reembolso será efetuado <strong>no prazo máximo de 14 dias</strong>, utilizando preferencialmente o mesmo meio de pagamento da compra, nos termos legais.</p>
<ul>
<li><strong>Cartão de crédito/débito:</strong> estorno junto à entidade emissora; o prazo de lançamento depende da instituição financeira;</li>
<li><strong>MB Way / Multibanco / transferência:</strong> devolução para a mesma conta de origem sempre que possível;</li>
<li><strong>Outros meios:</strong> conforme o método utilizado e os procedimentos da instituição responsável.</li>
</ul>
<p>Nos casos de devolução parcial, o reembolso corresponderá apenas ao valor dos produtos efetivamente devolvidos.</p>
<hr>
<h3>9. Situações em que a Devolução poderá ser recusada</h3>
<ul>
<li>produto com indícios de utilização incompatíveis com a análise ou com as exceções legais;</li>
<li>ausência de partes, acessórios ou itens que acompanham o produto;</li>
<li>danos causados por má utilização ou armazenamento inadequado;</li>
<li>solicitações realizadas fora dos prazos legais ou desta política.</li>
</ul>
<hr>
<h3>10. Cancelamento pela Loja</h3>
<p>A ${COMPANY.brand} poderá cancelar encomendas e promover o reembolso integral em caso de indisponibilidade definitiva de stock, inconsistências cadastrais, suspeita de fraude, falha na confirmação do pagamento ou determinação legal.</p>
<hr>
<h3>11. Como solicitar</h3>
<p>A solicitação poderá ser realizada através do formulário <a href="/fale-conosco">Fale Conosco</a>, indicando: nome completo, número da encomenda, motivo e fotografias quando necessário.</p>
<hr>
<h3>12. Livro de Reclamações</h3>
<p><a href="${COMPANY.livroReclamacoes}" target="_blank" rel="noopener noreferrer">Livro de Reclamações Eletrónico</a></p>
<p>Última atualização: outubro de 2026</p>
</div>`,
  },
  {
    slug: 'formas-de-pagamento',
    title: 'Formas de Pagamento',
    page_type: 'services',
    sort_order: 30,
    meta_description: 'Formas de pagamento aceites na Aurelle Cosmeticos.',
    content: `<div class="entry-content single-content">
<h2>Formas de Pagamento</h2>
<p>Na <strong>${COMPANY.brand}</strong>, os preços são apresentados em <strong>euros (EUR) com IVA incluído</strong>. Os custos de envio são mostrados antes da conclusão da compra.</p>
<p>As formas de pagamento disponíveis são as apresentadas no checkout no momento da compra e podem incluir, conforme configuração da loja:</p>
<ul>
<li>Cartão de crédito ou débito;</li>
<li>MB Way;</li>
<li>Referência Multibanco;</li>
<li>Outros métodos disponibilizados pelo intermediário de pagamento.</li>
</ul>
<p>A encomenda só é processada após a confirmação do pagamento. Dados completos de cartão não são armazenados nos nossos servidores.</p>
<p>Em caso de dúvidas, utilize o <a href="/fale-conosco">Fale Conosco</a>.</p>
</div>`,
  },
  {
    slug: 'central-de-ajuda',
    title: 'Central de Ajuda',
    page_type: 'support',
    sort_order: 10,
    meta_description: 'Central de Ajuda da Aurelle Cosmeticos.',
    content: `<div class="entry-content single-content">
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
<p><a href="${COMPANY.livroReclamacoes}" target="_blank" rel="noopener noreferrer">Livro de Reclamações Eletrónico</a></p>
</div>`,
  },
  {
    slug: 'fale-conosco',
    title: 'Fale Conosco',
    page_type: 'support',
    sort_order: 20,
    meta_description: 'Contacte a Aurelle Cosmeticos.',
    content: `<div class="entry-content single-content">
<h2>Fale Conosco</h2>
<p>Para questões sobre encomendas, devoluções, privacidade ou informações gerais, utilize o formulário disponível em <a href="/fale-conosco">/fale-conosco</a> ou os contactos indicados no rodapé do site.</p>
${contactBlock()}
<p><strong>Horário de atendimento:</strong> dias úteis (conforme indicado no rodapé do site). Mensagens enviadas fora do horário serão respondidas no próximo dia útil.</p>
</div>`,
  },
  {
    slug: 'resolucao-alternativa-litigios',
    title: 'Resolução Alternativa de Litígios',
    page_type: 'institutional',
    sort_order: 15,
    meta_description: 'Informação sobre entidades RAL de consumo em Portugal.',
    content: `<div class="entry-content single-content">
<h2>Resolução Alternativa de Litígios de Consumo (RAL)</h2>
<p>Nos termos da legislação portuguesa, informamos que, em caso de litígio de consumo, o consumidor pode recorrer a uma entidade de Resolução Alternativa de Litígios.</p>
<p>Pode consultar a lista atualizada de entidades RAL competentes no portal da Direção-Geral do Consumidor:</p>
<p><a href="https://www.consumidor.gov.pt" target="_blank" rel="noopener noreferrer">https://www.consumidor.gov.pt</a></p>
<p>Dispomos ainda de <a href="${COMPANY.livroReclamacoes}" target="_blank" rel="noopener noreferrer">Livro de Reclamações Eletrónico</a>.</p>
<p><em>A plataforma europeia ODR foi descontinuada em 2025; por esse motivo, não disponibilizamos essa ligação.</em></p>
${contactBlock()}
</div>`,
  },
]

function esc(s) {
  return s.replace(/'/g, "''")
}

function upsertPage(p) {
  return `
INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer, meta_description)
VALUES (
  '${esc(p.slug)}',
  '${esc(p.title)}',
  '${esc(p.page_type)}',
  ${p.sort_order},
  '${esc(p.content)}',
  true,
  true,
  ${p.meta_description ? `'${esc(p.meta_description)}'` : 'NULL'}
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
`
}

// Output pages as JSON for stepwise MCP apply
import { writeFileSync } from 'fs'
writeFileSync(
  new URL('./pages.json', import.meta.url),
  JSON.stringify({ company: COMPANY, pages }, null, 2)
)
console.log(`Wrote ${pages.length} pages to pages.json`)
for (const p of pages) {
  writeFileSync(new URL(`./page-${p.slug}.sql`, import.meta.url), upsertPage(p))
  console.log(`- ${p.slug} (${p.content.length} chars)`)
}
