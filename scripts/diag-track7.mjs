/**
 * Diagnóstico Track7 — não imprime a API key.
 * Uso: node --env-file=.env.local scripts/diag-track7.mjs
 */
const apiKey = process.env.TRACK7_API_KEY?.trim()
const baseUrl = (process.env.TRACK7_API_URL?.trim() || 'https://track7.app/api/v1').replace(
  /\/+$/,
  ''
)
const code = process.argv[2]?.trim() || 'PQA5129301764BR'

if (!apiKey) {
  console.error('TRACK7_API_KEY ausente')
  process.exit(1)
}

console.log('baseUrl:', baseUrl)
console.log('key prefix:', apiKey.slice(0, 6) + '…')
console.log('code:', code)

const paths = [
  `/tracking/${encodeURIComponent(code)}`,
  `/tracking?code=${encodeURIComponent(code)}`,
  `/trackings/${encodeURIComponent(code)}`,
  `/orders/tracking/${encodeURIComponent(code)}`,
]

const headerVariants = [
  { name: 'X-API-Key', headers: { 'X-API-Key': apiKey, Accept: 'application/json' } },
  {
    name: 'Authorization Bearer',
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  },
  {
    name: 'x-api-key lower',
    headers: { 'x-api-key': apiKey, Accept: 'application/json' },
  },
]

async function probe(url, headers, label) {
  const started = Date.now()
  try {
    const res = await fetch(url, { headers, cache: 'no-store' })
    const text = await res.text()
    const snippet = text.slice(0, 500)
    console.log(
      `\n[${label}] ${res.status} ${url} (${Date.now() - started}ms)\n${snippet || '(empty body)'}`
    )
  } catch (e) {
    console.log(`\n[${label}] NETWORK ${url} (${Date.now() - started}ms)\n${e?.message || e}`)
  }
}

for (const path of paths) {
  await probe(`${baseUrl}${path}`, headerVariants[0].headers, `X-API-Key ${path}`)
}

// Also try default track7.app if custom URL set
const defaults = ['https://track7.app/api/v1', 'https://api.track7.com.br/v1']
for (const base of defaults) {
  if (base.replace(/\/+$/, '') === baseUrl) continue
  await probe(
    `${base}/tracking/${encodeURIComponent(code)}`,
    headerVariants[0].headers,
    `alt ${base}`
  )
}

for (const variant of headerVariants.slice(1)) {
  await probe(
    `${baseUrl}/tracking/${encodeURIComponent(code)}`,
    variant.headers,
    variant.name
  )
}
