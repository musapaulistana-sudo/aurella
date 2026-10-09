import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
  const env = {}
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m) continue
    let v = m[2]
    const hash = v.indexOf('#')
    if (hash >= 0 && !v.trimStart().startsWith('"')) v = v.slice(0, hash).trimEnd()
    env[m[1]] = v.replace(/^["']|["']$/g, '')
  }
  return env
}

const env = loadEnv()
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const HOURS =
  'Segunda a sexta-feira: 09:00 às 19:00. Sábado: 09:00 às 13:00. Domingos e feriados: encerrado.'
const STORE = 'Aurelle Cosméticos'

const pages = {
  'politica-de-envio': {
    title: 'Política de Envio',
    meta_description:
      'Envio único em 6 a 10 dias úteis. Portes de 5 € abaixo de 40 €; grátis acima de 40 €.',
    content: `<div class="entry-content single-content">
<h2>Política de Envio e Entrega</h2>
<p>A <strong>${STORE}</strong> disponibiliza <strong>um único tipo de envio</strong>, com entrega estimada em <strong>6 a 10 dias úteis</strong> após a expedição.</p>
<p><strong>Horário de atendimento:</strong> ${HOURS} As encomendas são processadas apenas em dias úteis (segunda a sexta-feira), exceto feriados.</p>
<hr>
<h3>1. Processamento das Encomendas</h3>
<p>Após a confirmação do pagamento, a encomenda passa por um prazo de até <strong>3 (três) dias úteis</strong> para separação, conferência e preparação para envio.</p>
<hr>
<h3>2. Prazo de Entrega</h3>
<p>Após o envio, o prazo estimado de entrega é de <strong>6 a 10 dias úteis</strong>.</p>
<p>Os prazos são estimados em dias úteis (excluindo sábados, domingos e feriados) e podem variar consoante o código postal e a atuação da transportadora.</p>
<hr>
<h3>3. Custo de Envio</h3>
<ul>
<li>Compras <strong>até 40 €</strong>: portes de <strong>5 €</strong>;</li>
<li>Compras <strong>superiores a 40 €</strong>: <strong>envios grátis</strong>.</li>
</ul>
<p>O valor dos portes é calculado automaticamente no carrinho e confirmado no checkout.</p>
<hr>
<h3>4. Rastreamento da Encomenda</h3>
<p>Após a expedição, o cliente poderá acompanhar a entrega em <strong>«As Minhas Encomendas»</strong> ou na página de rastreio, quando disponível.</p>
<hr>
<h3>5. Tentativas de Entrega</h3>
<p>As transportadoras poderão realizar até <strong>3 (três) tentativas de entrega</strong> na morada indicada. Se a entrega não for concluída, a encomenda poderá regressar ao centro de distribuição e poderá ser cobrado um novo envio para reexpedição.</p>
<hr>
<h3>6. Morada de Entrega</h3>
<p>É da responsabilidade do cliente indicar corretamente os dados de entrega. A ${STORE} não se responsabiliza por atrasos ou devoluções decorrentes de morada incorreta, dados incompletos, ausência do destinatário ou recusa injustificada do recebimento.</p>
<hr>
<h3>7. Atrasos, Extravio ou Avaria</h3>
<p>Podem ocorrer atrasos por fatores externos. Em caso de extravio ou avaria comprovada durante o transporte, analisaremos a ocorrência e poderemos proceder ao reenvio, substituição ou reembolso, nos termos da legislação aplicável.</p>
<p>Última atualização: outubro de 2026</p>
</div>`,
  },
  'prazo-e-entrega': {
    title: 'Prazo e Entrega',
    meta_description: 'Prazo de 6 a 10 dias úteis. Portes 5 € abaixo de 40 €; grátis acima.',
    content: `<div class="entry-content single-content">
<h2>Prazo e Entrega</h2>
<p>Resumo do envio da <strong>${STORE}</strong>. Para a política completa, consulte a <a href="/paginas/politica-de-envio">Política de Envio</a>.</p>
<ul>
<li><strong>Processamento:</strong> até 3 dias úteis após confirmação do pagamento;</li>
<li><strong>Prazo de entrega:</strong> 6 a 10 dias úteis após o envio;</li>
<li><strong>Portes:</strong> 5 € em compras até 40 €; <strong>grátis acima de 40 €</strong>.</li>
</ul>
<p><strong>Horário de atendimento:</strong> ${HOURS}</p>
<p>Última atualização: outubro de 2026</p>
</div>`,
  },
  'frete-gratis': {
    title: 'Portes Grátis',
    meta_description: 'Envios grátis em compras superiores a 40 € na Aurelle Cosméticos.',
    content: `<div class="entry-content single-content">
<h2>Portes Grátis</h2>
<p>Na <strong>${STORE}</strong>, os <strong>envios são grátis em compras superiores a 40 €</strong>.</p>
<ul>
<li>Em compras até 40 €, o custo de envio é de <strong>5 €</strong>;</li>
<li>O prazo estimado de entrega é de <strong>6 a 10 dias úteis</strong> após o envio;</li>
<li>O benefício é calculado automaticamente no carrinho e confirmado no checkout.</li>
</ul>
<p>Consulte também a <a href="/paginas/politica-de-envio">Política de Envio</a>.</p>
<p>Última atualização: outubro de 2026</p>
</div>`,
  },
  'central-de-ajuda': {
    title: 'Central de Ajuda',
    meta_description: 'Ajuda sobre envios, devoluções, pagamentos e contacto.',
    content: `<div class="entry-content single-content">
<h2>Central de Ajuda</h2>
<p>Como podemos ajudar?</p>
<ul>
<li><a href="/paginas/politica-de-envio">Política de Envio</a> — 6 a 10 dias úteis; 5 € abaixo de 40 €; grátis acima de 40 €</li>
<li><a href="/paginas/politica-de-devolucao-e-reembolso">Devolução e Reembolso</a> — 14 dias de livre resolução</li>
<li><a href="/paginas/formas-de-pagamento">Formas de Pagamento</a></li>
<li><a href="/paginas/politica-de-privacidade">Política de Privacidade (RGPD)</a></li>
<li><a href="/paginas/informacoes-legais">Informações Legais</a></li>
<li><a href="/fale-conosco">Fale Connosco</a></li>
<li><a href="/rastreio">Rastrear Encomenda</a></li>
</ul>
<p><strong>Horário de atendimento:</strong> ${HOURS}</p>
<p><a href="https://www.livroreclamacoes.pt/Inicio/" target="_blank" rel="noopener noreferrer">Livro de Reclamações Eletrónico</a></p>
</div>`,
  },
  'formas-de-pagamento': {
    title: 'Formas de Pagamento',
    meta_description: 'Visa, Mastercard, MB Way e Multibanco.',
    content: `<div class="entry-content single-content">
<h2>Formas de Pagamento</h2>
<p>Os custos de envio são mostrados antes da conclusão da compra: <strong>5 €</strong> em compras até 40 € e <strong>grátis acima de 40 €</strong>, com entrega estimada em 6 a 10 dias úteis.</p>
<p>Aceitamos as seguintes formas de pagamento:</p>
<ul>
<li><strong>Visa</strong></li>
<li><strong>Mastercard</strong></li>
<li><strong>MB Way</strong></li>
<li><strong>Referência Multibanco</strong></li>
</ul>
<p>A encomenda só é processada após a confirmação do pagamento. Dados completos de cartão não são armazenados nos nossos servidores.</p>
<p>Em caso de dúvidas, utilize o <a href="/fale-conosco">Fale Connosco</a>.</p>
</div>`,
  },
}

async function main() {
  for (const [slug, data] of Object.entries(pages)) {
    const { error } = await sb
      .from('footer_pages')
      .update({
        title: data.title,
        content: data.content,
        meta_description: data.meta_description,
        updated_at: new Date().toISOString(),
      })
      .eq('slug', slug)
    console.log(slug, error ? error.message : 'OK')
  }

  // Soft-update termos shipping paragraph if still mentions old modalities
  const { data: termos } = await sb
    .from('footer_pages')
    .select('content')
    .eq('slug', 'termos-e-condicoes-de-uso')
    .maybeSingle()

  if (termos?.content) {
    let next = termos.content
    next = next.replace(
      /incluindo a promoção de <strong>portes grátis em compras superiores a 40 € em Portugal Continental<\/strong>/g,
      'incluindo portes de <strong>5 €</strong> até 40 € e <strong>portes grátis acima de 40 €</strong>, com entrega em 6 a 10 dias úteis'
    )
    next = next.replace(
      /portes grátis em compras superiores a 40 € em Portugal Continental/g,
      'portes de 5 € até 40 € e portes grátis acima de 40 € (6 a 10 dias úteis)'
    )
    if (next !== termos.content) {
      const { error } = await sb
        .from('footer_pages')
        .update({ content: next, updated_at: new Date().toISOString() })
        .eq('slug', 'termos-e-condicoes-de-uso')
      console.log('termos', error ? error.message : 'OK')
    } else {
      console.log('termos unchanged')
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
