
INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer, meta_description)
VALUES (
  'politica-de-envio',
  'Política de Envio',
  'services',
  10,
  '<div class="entry-content single-content">
<h1>Política de Envio e Entrega</h1>
<p>A <strong>Aurelle Cosmeticos</strong> realiza entregas em Portugal continental e Regiões Autónomas (quando disponível) através de transportadoras e operadores logísticos parceiros. Os países e zonas atendidos, bem como os custos, são apresentados no checkout antes da conclusão da compra.</p>
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
<p>A Aurelle Cosmeticos não se responsabiliza por atrasos ou devoluções decorrentes de:</p>
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
<p>Caso a encomenda seja extraviada durante o transporte ou entregue com avarias comprovadas, a Aurelle Cosmeticos realizará a análise da ocorrência. Após confirmação, poderá ser adotada uma das seguintes soluções:</p>
<ul>
<li>Reenvio do produto;</li>
<li>Troca da mercadoria;</li>
<li>Reembolso integral do valor pago, conforme a legislação aplicável.</li>
</ul>
</div>',
  true,
  true,
  'Prazos, custos e condições de envio da Aurelle Cosmeticos em Portugal.'
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
