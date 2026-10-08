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

const WHITELIST_BRANDS = new Set(
  [
    'la roche posay',
    'eucerin',
    'cerave',
    'svr',
    'vichy',
    'avène',
    'avene',
    'lazartigue',
    'essence',
    'barral',
    'atl',
    'noreva',
    'segle',
    'ducray',
    'klorane',
    'uriage',
    'bioderma',
    'isdin',
    'mustela',
    'nuxe',
    'heliocare',
    'filorga',
    'sesderma',
    'martiderm',
    'endocare',
    'a-derma',
    'aderma',
    'topicrem',
    'physiogel',
    'cetaphil',
    'neutrogena',
    'nivea',
    'weleda',
    'lavera',
    'babé',
    'babe',
    'acm',
    'roc',
  ].map((s) => s.toLowerCase())
)

const KEEP_CAT_HINT =
  /^(cosm[eé]tica|dermocosm[eé]tica|cuidados do rosto|cuidados do corpo|cuidados do corpo \/ hidrata[cç][aã]o|solares|protetores solares|prote[cç][aã]o solar|cabelo|coloração de cabelos|higiene e banho|banho|banho beb[eé]|produtos de higiene pessoal|cuidados com a pele|pele|corpo|corporal|cuidados masculinos do rosto|higiene|ceravesolares|cicatrizantes e regeneradores pele|cicatrização e regeneração da pele|cremes barreira e protetores da pele)$/i

const DROP_CAT =
  /orto|fisioterap|reabilita|m[eé]dico|cir[uú]rg|podolog|compress[aã]o|meias de|tala|palmilha|ligadura|pressoterap|mobili[aá]rio|cuidadores|vida di[aá]ria|ajudas t[eé]cnicas|cadeira|banco de banho|fralda|incontin|nebuliz|ox[ií]metro|tens[ií]metro|estetosc|sonda|cateter|seringa|gaze|luva|sutura|transfer|andarilho|muleta|canadianas|gin[aá]sio|exerc[ií]cio|almofada|posicionamento|descart|consum[ií]veis|nutri[cç][aã]o|fresubin|dieta|testes? de|diagn[oó]stico/i

const MEDICINE =
  /\b(comprimido|c[aá]psula|saqueta oral|xarope|medicament|antibiótico|antibiot|anti-?histam|ibuprofeno|paracetamol|omeprazol|suplemento alimentar|colag[eé]nio oral|vitamina\b|omega|ómega|probi[oó]tico|laxante|anti[- ]?inflam)/i

const ORAL_KEEP = /vitis|dentaid|parodontax|corega|higiene (e )?(cuidado )?oral|sa[uú]de oral|pasta dent[ií]frica|elixir|fio dent[aá]rio|escova de dentes/i

/** Map CSV category tokens → loja PT-PT */
const CATEGORY_MAP = [
  {
    slug: 'cuidados-com-a-pele',
    name: 'Cuidados com a Pele',
    match: /rosto|pele|dermocosm|cicatriz|regener|barreira|imperfei|anti[- ]?idade|anti[- ]?rugas|hidrat|s[eé]rum|creme facial|effaclar|hyalu|filler|elastic/i,
  },
  {
    slug: 'cuidados-do-corpo',
    name: 'Cuidados do Corpo',
    match: /corpo|corporal|hidrata[cç][aã]o|lipikar|topialyse|óleo lavante|oleo lavante|gel lavante|barral|atl\b/i,
  },
  {
    slug: 'protecao-solar',
    name: 'Proteção Solar',
    match: /solar|solares|spf|p[oó]s-?solar|sunlight|capital soleil|anthelios/i,
  },
  {
    slug: 'cabelo',
    name: 'Cabelo',
    match: /cabelo|champ[oô]|shampoo|condicionador|lazartigue|coloração|mascara.*cabel|máscara.*cabel/i,
  },
  {
    slug: 'higiene-pessoal',
    name: 'Higiene Pessoal',
    match: /higiene|banho|sabonete|desodoriz|deo |spirial|toalhitas|gel de banho/i,
  },
  {
    slug: 'maquilhagem',
    name: 'Maquilhagem',
    match: /essence|maquilh|batom|lipgloss|m[aá]scara.*olho|sombra de olhos|blush|base de/i,
  },
  {
    slug: 'saude-oral',
    name: 'Saúde Oral',
    match: /oral|vitis|dentaid|parodontax|corega|dent[ií]fric|elixir|fio dent/i,
  },
  {
    slug: 'cosmetica',
    name: 'Cosmética',
    match: /cosm[eé]tica/i,
  },
]

function mapCategories(catsStr, name, brand) {
  const blob = `${catsStr} ${name} ${brand}`
  const out = []

  // Hair-first: coloração / champô não devem ir para cuidados com a pele
  if (/coloração|colora[cç][aã]o|champ[oô]|shampoo|condicionador|lazartigue|cabelo/i.test(blob)) {
    out.push(CATEGORY_MAP.find((c) => c.slug === 'cabelo'))
  }
  if (/essence|batom|lipgloss|sombra de olhos|m[aá]scara.*olho|maquilh/i.test(blob)) {
    out.push(CATEGORY_MAP.find((c) => c.slug === 'maquilhagem'))
  }
  if (/solar|solares|spf|anthelios|capital soleil|sunlight|p[oó]s-?solar/i.test(blob)) {
    out.push(CATEGORY_MAP.find((c) => c.slug === 'protecao-solar'))
  }
  if (
    /corpo|corporal|lipikar|topialyse|[oó]leo lavante|gel lavante|barral|\batl\b|hidrata[cç][aã]o corporal/i.test(
      blob
    ) &&
    !/coloração|champ[oô]|sombra|batom/i.test(name)
  ) {
    out.push(CATEGORY_MAP.find((c) => c.slug === 'cuidados-do-corpo'))
  }
  if (
    /rosto|dermocosm|cicatriz|regener|barreira|imperfei|anti[- ]?idade|anti[- ]?rugas|s[eé]rum|effaclar|hyalu|filler|elastic|contorno de olhos|creme facial|hidratante facial|cerave|eucerin|cicalfate/i.test(
      blob
    ) &&
    !/coloração|champ[oô]|sombra|batom|lipgloss|solar|spf/i.test(name)
  ) {
    out.push(CATEGORY_MAP.find((c) => c.slug === 'cuidados-com-a-pele'))
  }
  if (/higiene|banho|sabonete|desodoriz|spirial|toalhitas|gel de banho/i.test(blob) && !/cadeira|banco de banho/i.test(blob)) {
    out.push(CATEGORY_MAP.find((c) => c.slug === 'higiene-pessoal'))
  }

  // unique
  const seen = new Set()
  const unique = out.filter((c) => c && (seen.has(c.slug) ? false : (seen.add(c.slug), true)))
  if (unique.length === 0) unique.push(CATEGORY_MAP.find((c) => c.slug === 'cosmetica'))
  return unique
}

function brandAllowed(brand) {
  const b = brand.toLowerCase().trim()
  if (!b) return false
  for (const w of WHITELIST_BRANDS) if (b.includes(w) || w.includes(b)) return true
  return false
}

function isCosmetic(name, brand, catsStr) {
  const blob = `${name} ${brand} ${catsStr}`
  if (DROP_CAT.test(catsStr) && !/cosm[eé]tica|dermocosm|cuidados do|solares|cabelo|higiene e banho|pele/i.test(catsStr)) {
    return false
  }
  if (MEDICINE.test(blob) && !ORAL_KEEP.test(blob)) return false
  if (DROP_CAT.test(name)) return false

  if (brandAllowed(brand)) return true

  // category-based for distributor labels (Mednord/Opuscare) only if clearly cosmetic cats
  const cosmeticCats = catsStr
    .split(',')
    .map((s) => s.trim())
    .filter((c) => KEEP_CAT_HINT.test(c) || /dermocosm|cosm[eé]tica|cuidados do rosto|cuidados do corpo|solares|cabelo|higiene e banho|produtos de higiene pessoal|cuidados com a pele/i.test(c))

  if (cosmeticCats.length === 0) return false

  // distributor brand: require cosmetic name signals
  if (/mednord|opuscare|prim|orthos|d3tape|relaxsan|aga\b|hartmann|b\.?\s*braun/i.test(brand)) {
    return /creme|s[eé]rum|champ[oô]|lo[cç][aã]o|hidrat|solar|spf|gel lavante|[oó]leo|desodoriz|batom|lipgloss|sombra|m[aá]scara|effaclar|hyalu|lipikar|topialyse|cerave|eucerin|roche|vichy|svr|av[eè]ne|lazartigue|barral/i.test(
      `${name} ${catsStr}`
    )
  }

  return true
}

const rows = parseCsv(raw)
const header = rows[0]
const idx = Object.fromEntries(header.map((h, i) => [h, i]))
const parents = rows.slice(1).filter((r) => {
  const t = (r[idx['Tipo']] || '').toLowerCase()
  return t === 'simple' || t === 'variable'
})

const selected = []
for (const r of parents) {
  const name = (r[idx['Nome']] || '').trim()
  const brand = (r[idx['Brands']] || '').trim()
  const catsStr = r[idx['Categorias']] || ''
  const sku = (r[idx['SKU']] || '').trim()
  const published = String(r[idx['Publicado']] || '') === '1'
  if (!sku || !name) continue
  if (!isCosmetic(name, brand, catsStr)) continue

  const categories = mapCategories(catsStr, name, brand)
  const priority =
    (brandAllowed(brand) ? 100 : 0) +
    (/la roche|eucerin|cerave|svr|vichy|av[eè]ne/i.test(brand) ? 50 : 0) +
    (published ? 10 : 0)

  selected.push({
    sku,
    name,
    brand: brand || 'Sem marca',
    categories: categories.map((c) => ({ slug: c.slug, name: c.name })),
    priority,
    published,
  })
}

// Prefer whitelist brands first, cap ~400
selected.sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name, 'pt'))
const capped = selected.slice(0, 420)

const brandCounts = new Map()
const catCounts = new Map()
for (const p of capped) {
  brandCounts.set(p.brand, (brandCounts.get(p.brand) || 0) + 1)
  for (const c of p.categories) catCounts.set(c.name, (catCounts.get(c.name) || 0) + 1)
}

console.log('selected before cap', selected.length)
console.log('capped', capped.length)
console.log('brands', [...brandCounts.entries()].sort((a, b) => b[1] - a[1]))
console.log('cats', [...catCounts.entries()].sort((a, b) => b[1] - a[1]))

writeFileSync(
  'd:/cosmeticospt/tmp/cosmetics-keep.json',
  JSON.stringify(
    {
      keepSkus: capped.map((p) => p.sku),
      products: capped,
      taxonomy: CATEGORY_MAP.map((c) => ({ slug: c.slug, name: c.name })),
    },
    null,
    2
  )
)
console.log('wrote tmp/cosmetics-keep.json')
