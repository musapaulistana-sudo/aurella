INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer, meta_description)
VALUES (
  'politica-de-privacidade',
  'Política de Privacidade',
  'policy',
  20,
  $content$<div class="entry-content single-content">
<h2>Política de Privacidade</h2>
<p>Esta Política explica como a <strong>Aurelle Cosmeticos</strong>, operada por <strong>VOLUMEXATO - LDA</strong>, trata dados pessoais de visitantes, clientes e utilizadores registados, em conformidade com o Regulamento Geral sobre a Proteção de Dados (RGPD — Regulamento (UE) 2016/679), a Lei n.º 58/2019 e demais normas aplicáveis.</p>
<ol>
<li><strong>RESPONSÁVEL PELO TRATAMENTO</strong><br>
VOLUMEXATO - LDA, NIPC 519621980, sede em Avenida Infante Dom Henrique 107, 2º Direito, Tercena, 2730-100 Barcarena.
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
<p><strong>Nome comercial:</strong> Aurelle Cosmeticos</p>
<p><strong>Firma:</strong> VOLUMEXATO - LDA (Sociedade por Quotas)</p>
<p><strong>NIPC:</strong> 519621980</p>
<p><strong>Sede:</strong> Avenida Infante Dom Henrique 107, 2º Direito, Tercena, 2730-100 Barcarena</p>
<p><strong>Capital social:</strong> 10.000 €</p>
<p><strong>Registo comercial:</strong> Matriculada na Conservatória do Registo Comercial sob o NIPC 519621980</p>
<p><strong>Contacto:</strong> utilize o formulário <a href="/fale-conosco">Fale Conosco</a> disponível no site.</p>
<p>Última atualização: outubro de 2026</p>
</div>$content$,
  true,
  true,
  'Política de Privacidade RGPD da Aurelle Cosmeticos.'
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
