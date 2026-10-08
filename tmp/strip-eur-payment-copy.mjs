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

const formas = `<div class="entry-content single-content">
<h2>Formas de Pagamento</h2>
<p>Os custos de envio (incluindo portes grátis acima de 40 € em Portugal Continental) são mostrados antes da conclusão da compra.</p>
<p>Aceitamos as seguintes formas de pagamento:</p>
<ul>
<li><strong>Visa</strong></li>
<li><strong>Mastercard</strong></li>
<li><strong>MB Way</strong></li>
<li><strong>Referência Multibanco</strong></li>
</ul>
<p>A encomenda só é processada após a confirmação do pagamento. Dados completos de cartão não são armazenados nos nossos servidores.</p>
<p>Em caso de dúvidas, utilize o <a href="/fale-conosco">Fale Connosco</a>.</p>
</div>`

const { error: e1 } = await sb
  .from('footer_pages')
  .update({ content: formas })
  .eq('slug', 'formas-de-pagamento')

const { data: termos } = await sb
  .from('footer_pages')
  .select('content')
  .eq('slug', 'termos-e-condicoes-de-uso')
  .maybeSingle()

if (termos?.content) {
  const next = termos.content
    .replace(
      /Os preços são apresentados em euros \(EUR\) com IVA incluído, salvo indicação em contrário\. /g,
      ''
    )
    .replace(
      /Os preços são apresentados em euros \(EUR\) com IVA incluído\. /g,
      ''
    )
  const { error: e2 } = await sb
    .from('footer_pages')
    .update({ content: next })
    .eq('slug', 'termos-e-condicoes-de-uso')
  console.log('termos', e2?.message ?? 'OK')
}

console.log('formas', e1?.message ?? 'OK')
