/**
 * Diagnóstico do fluxo de cartão PayoutBR (tokenização + formato de resposta).
 * Uso: node --env-file=.env.local scripts/diag-card-payment.mjs
 *
 * NÃO cria cobrança real — só testa /card-token com cartão de teste.
 */
import { createClient } from '@supabase/supabase-js'

const publicKey = process.env.PAYOUT_PUBLIC_KEY?.trim()
const secretKey = process.env.PAYOUT_SECRET_KEY?.trim()
const apiUrl = (process.env.PAYOUT_API_URL?.trim() || 'https://api.payoutbr.com.br/v1').replace(
  /\/+$/,
  ''
)

function mask(value) {
  if (!value) return '(ausente)'
  if (value.length <= 12) return `${value.slice(0, 4)}***`
  return `${value.slice(0, 10)}…${value.slice(-4)}`
}

function extractCardHash(result) {
  if (typeof result === 'string' && result.trim().length >= 10) return result.trim()
  if (!result || typeof result !== 'object') return null
  for (const key of ['hash', 'token', 'card_hash', 'cardHash']) {
    const value = result[key]
    if (typeof value === 'string' && value.trim().length >= 10) return value.trim()
  }
  if (result.card && typeof result.card === 'object') {
    return extractCardHash(result.card)
  }
  if (result.data && typeof result.data === 'object') {
    return extractCardHash(result.data)
  }
  return null
}

async function postJson(url, body, headers = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text.slice(0, 500) }
  }
  return { status: res.status, ok: res.ok, json, text: text.slice(0, 800) }
}

console.log('=== Diagnóstico pagamento cartão PayoutBR ===\n')
console.log('PAYOUT_PUBLIC_KEY:', mask(publicKey))
console.log('PAYOUT_SECRET_KEY:', mask(secretKey))
console.log('PAYOUT_API_URL:', apiUrl)
console.log('KEY_MODE:', publicKey?.includes('pk_live') ? 'LIVE' : 'TEST/SANDBOX')

if (!publicKey) {
  console.error('\nFAIL: PAYOUT_PUBLIC_KEY ausente')
  process.exit(1)
}

// 1) Config checkout no banco
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (supabaseUrl && serviceKey) {
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: settings } = await admin
    .from('site_settings')
    .select('payment_checkout_config')
    .limit(1)
    .maybeSingle()
  console.log('\n--- site_settings.payment_checkout_config ---')
  console.log(JSON.stringify(settings?.payment_checkout_config ?? null, null, 2))

  const { data: recent } = await admin
    .from('orders')
    .select('id, status, payment_status, payment_method, total, payout_transaction_id, created_at')
    .order('created_at', { ascending: false })
    .limit(15)
  console.log('\n--- Últimos 15 pedidos ---')
  for (const row of recent ?? []) {
    console.log(
      `${row.created_at} | ${row.payment_method ?? 'null'} | ${row.status}/${row.payment_status ?? 'null'} | R$ ${row.total} | tx=${row.payout_transaction_id ?? '-'}`
    )
  }

  const { count: cardCount } = await admin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('payment_method', 'credit_card')
  const { count: pixCount } = await admin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('payment_method', 'pix')
  console.log(`\nTotais: credit_card=${cardCount ?? 0} | pix=${pixCount ?? 0}`)
} else {
  console.log('\n(skip DB: SUPABASE_* ausente)')
}

// 2) Tokenização — payload igual ao SDK oficial
const testCards = [
  {
    label: 'visa-test 4111… (ints)',
    body: {
      number: '4111111111111111',
      holderName: 'Bruce Wayne',
      expirationMonth: 12,
      expirationYear: 2030,
      cvv: '123',
    },
  },
  {
    label: 'visa-test 4111… (strings — bug antigo)',
    body: {
      number: '4111111111111111',
      holderName: 'Bruce Wayne',
      expirationMonth: '12',
      expirationYear: '2030',
      cvv: '123',
    },
  },
  {
    label: 'mastercard-test 5555… (ints)',
    body: {
      number: '5555555555554444',
      holderName: 'Maria Silva',
      expirationMonth: 1,
      expirationYear: 2032,
      cvv: '123',
    },
  },
]

console.log('\n--- POST /card-token ---')
let firstHash = null
for (const sample of testCards) {
  const url = `${apiUrl}/card-token?publicKey=${encodeURIComponent(publicKey)}`
  const result = await postJson(url, sample.body)
  const hash = extractCardHash(result.json)
  console.log(`\n[${sample.label}]`)
  console.log('  status:', result.status, 'ok:', result.ok)
  console.log('  keys:', result.json && typeof result.json === 'object' ? Object.keys(result.json) : typeof result.json)
  console.log('  message:', result.json?.message ?? result.json?.error ?? '-')
  console.log('  hash extracted:', hash ? `${hash.slice(0, 16)}… (len=${hash.length})` : 'NULL')
  if (!hash) {
    console.log('  body preview:', result.text)
  }
  if (hash && !firstHash) firstHash = hash
}

// 3) Se tokenizou, valida que a secret key autentica (sem criar cobrança de valor alto)
if (secretKey) {
  console.log('\n--- GET /company (auth secret) ---')
  const auth = Buffer.from(`${secretKey}:x`).toString('base64')
  const company = await fetch(`${apiUrl}/company`, {
    headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
  })
  const companyText = await company.text()
  console.log('  status:', company.status)
  console.log('  body:', companyText.slice(0, 300))
} else {
  console.log('\nFAIL: PAYOUT_SECRET_KEY ausente')
}

console.log('\n=== Resumo ===')
if (firstHash) {
  console.log('OK: tokenização respondeu com hash — etapa card-token funcional com estas chaves.')
  console.log('Se o checkout ainda falha, o problema está em /api/checkout/card (payload/transação).')
} else {
  console.log('FAIL: nenhuma tokenização retornou hash.')
  console.log('Com pk_live, cartões de teste costumam ser rejeitados — use cartão real ou chave sk_test/pk_test.')
  console.log('Se Pix funciona com a mesma secret, a public key / card-token / modo live é o foco.')
}
