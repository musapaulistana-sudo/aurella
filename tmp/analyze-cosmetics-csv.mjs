import { readFileSync, writeFileSync } from 'fs'

const raw = readFileSync('d:/cosmeticospt/opuscare_woocommerce_20260929_162928.csv', 'utf8')

function parseCsv(text) {
  const normalized = text.replace(/^\uFEFF/, '')
  const rows = []
  let row = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < normalized.length; i++) {
    const c = normalized[i]
    if (quoted) {
      if (c === '"' && normalized[i + 1] === '"') {
        cur += '"'
        i++
      } else if (c === '"') quoted = false
      else cur += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(cur)
      cur = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && normalized[i + 1] === '\n') i++
      row.push(cur)
      rows.push(row)
      row = []
      cur = ''
    } else cur += c
  }
  if (cur || row.length) {
    row.push(cur)
    rows.push(row)
  }
  return rows
}

const rows = parseCsv(raw)
const header = rows[0]
const idx = Object.fromEntries(header.map((h, i) => [h, i]))
const data = rows.slice(1).filter((r) => r.length > 5)
const parents = data.filter((r) => {
  const t = (r[idx['Tipo']] || '').toLowerCase()
  return t === 'simple' || t === 'variable'
})

const brands = new Map()
const cats = new Map()

const COSMETIC_BRANDS = [
  'eucerin',
  'la roche',
  'laroche',
  'avène',
  'avene',
  'vichy',
  'cerave',
  'cetaphil',
  'bioderma',
  'uriage',
  'isdin',
  'nivea',
  'neutrogena',
  'loreal',
  "l'oreal",
  'garnier',
  'nuxe',
  'svs',
  'svs pharmacy',
  'mustela',
  'weleda',
  'the ordinary',
  'cera',
  'bepanthen',
  'ducray',
  'klorane',
  'roc',
  'filorga',
  'sesderma',
  'svr',
  'acm',
  'a-derma',
  'aderma',
  'topicrem',
  'physiogel',
  'babor',
  'clarins',
  'clinique',
  'dermo',
  'isdin',
  'heliocare',
  'skinceuticals',
  'paula',
  'cattier',
  'nuxe',
  'pharmaceris',
  'lavera',
  'alva',
  'babe',
  'babé',
  'martiderm',
  'endocare',
  'neostrata',
  'obagi',
  'skin',
]

const COSMETIC_CAT = /cosm[eé]tica|cuidados? (com )?a pele|rosto|corpo|cabelo|higiene|banho|maquilh|perfume|desodoriz|solar|anti-?idade|limpeza facial|skincare|beleza/i
const COSMETIC_NAME =
  /\b(creme|lo[cç][aã]o|s[eé]rum|serum|shampoo|condicionador|sabonete|gel de banho|protetor solar|bb cream|cc cream|hidratante|tonico|t[oó]nico|esfoliante|m[aá]scara facial|óleo corporal|oleo corporal|desodorizante|perfume|eau de|batom|r[ií]mel|base de maquilh|blush|iluminador|anti-idade|anti idade|antirrugas|contorno de olhos|cleansing|moisturizer)\b/i
const MEDICINE_OR_ORTHO =
  /\b(comprimido|c[aá]psula|medicament|antibiótico|antibiot|xarope|rem[eé]dio|farm[aá]cia|orto|tala|palmilha|meia(?:s)? de compress|ligadura|fisioterap|cadeira de rodas|andarilho|muleta|sonda|luva cir[uú]rg|seringa|gaze|cateter|imobilizador|ort[oó]tese|pressoterapia|almofada de assento|transfer[eê]ncia|muleta|canadianas|fralda|incontin|nebulizador|ox[ií]metro|tens[ií]metro|estetosc|term[oô]metro cl[ií]nico|bisturi|sutura|curativo adesivo|esparadrapo)\b/i

const candidates = []

for (const r of parents) {
  const b = (r[idx['Brands']] || '').trim()
  const name = r[idx['Nome']] || ''
  const catsStr = r[idx['Categorias']] || ''
  const sku = r[idx['SKU']] || ''
  const price = r[idx['Preço']] || ''
  const published = r[idx['Publicado']] || ''
  if (b) brands.set(b, (brands.get(b) || 0) + 1)
  for (const c of catsStr.split(',').map((s) => s.trim()).filter(Boolean)) {
    cats.set(c, (cats.get(c) || 0) + 1)
  }

  const brandHit = COSMETIC_BRANDS.some((x) => b.toLowerCase().includes(x) || name.toLowerCase().includes(x))
  const catHit = COSMETIC_CAT.test(catsStr)
  const nameHit = COSMETIC_NAME.test(name)
  const blocked = MEDICINE_OR_ORTHO.test(`${name} ${catsStr}`)

  if (!blocked && (brandHit || catHit || nameHit)) {
    candidates.push({
      sku,
      name,
      brand: b,
      categories: catsStr,
      price,
      published,
      reason: brandHit ? 'brand' : catHit ? 'cat' : 'name',
    })
  }
}

console.log('parents', parents.length)
console.log('candidates', candidates.length)
console.log('by reason', {
  brand: candidates.filter((c) => c.reason === 'brand').length,
  cat: candidates.filter((c) => c.reason === 'cat').length,
  name: candidates.filter((c) => c.reason === 'name').length,
})

console.log('\n--- CANDIDATE BRANDS ---')
const cb = new Map()
for (const c of candidates) cb.set(c.brand || '(sem)', (cb.get(c.brand || '(sem)') || 0) + 1)
;[...cb.entries()]
  .sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log(v + '\t' + k))

console.log('\n--- ALL BRANDS ---')
;[...brands.entries()]
  .sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log(v + '\t' + k))

console.log('\n--- CATS with cosm ---')
;[...cats.entries()]
  .filter(([k]) => /cosm|pele|higiene|beleza|cabelo|banho|rosto|corpo|solar/i.test(k))
  .sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log(v + '\t' + k))

writeFileSync(
  'd:/cosmeticospt/tmp/cosmetic-candidates.json',
  JSON.stringify({ total: candidates.length, candidates }, null, 2)
)
console.log('\nwrote tmp/cosmetic-candidates.json')
