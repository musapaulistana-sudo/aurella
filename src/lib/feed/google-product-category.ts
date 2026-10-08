/**
 * Mapeamento para o atributo `google_product_category` do Merchant Center.
 *
 * Cada produto deve enviar OU o ID numérico OU o caminho completo da taxonomia
 * do Google — nunca os dois (https://support.google.com/merchants/answer/6324436).
 * Usamos o ID numérico, que é estável independente do idioma.
 *
 * IDs conferidos em:
 * https://www.google.com/basepages/producttype/taxonomy-with-ids.pt-BR.txt
 */

export type GoogleProductCategory = {
  id: string
  path: string
}

/** Fallback genérico: "Saúde e beleza". Nunca deixa um produto sem categoria. */
export const DEFAULT_GOOGLE_PRODUCT_CATEGORY: GoogleProductCategory = {
  id: '469',
  path: 'Saúde e beleza',
}

/**
 * Mapa por slug de categoria da loja (`categories.slug`) → categoria Google.
 * Ajuste/estenda aqui conforme novas categorias forem cadastradas na loja.
 */
export const CATEGORY_SLUG_TO_GOOGLE: Record<string, GoogleProductCategory> = {
  'cuidados-com-a-pele': {
    id: '567',
    path: 'Saúde e beleza > Cuidados pessoais > Cosméticos > Cuidados com a pele',
  },
  'protecao-solar': {
    id: '2844',
    path: 'Saúde e beleza > Cuidados pessoais > Cosméticos > Cuidados com a pele > Bloqueadores solares',
  },
  'cuidados-capilares': {
    id: '486',
    path: 'Saúde e beleza > Cuidados pessoais > Cuidados com os cabelos',
  },
  'maquiagens-e-acessorios': {
    id: '477',
    path: 'Saúde e beleza > Cuidados pessoais > Cosméticos > Maquiagem',
  },
  'higiene-pessoal': {
    id: '2915',
    path: 'Saúde e beleza > Cuidados pessoais',
  },
  'fraldas-e-lencos-umedecidos': {
    id: '548',
    path: 'Infantil > Troca de fraldas',
  },
  'mamae-e-bebe': {
    id: '537',
    path: 'Infantil',
  },
  'beleza-e-saude': DEFAULT_GOOGLE_PRODUCT_CATEGORY,
}

/** Palavras-chave para inferir categoria quando o slug não bate exatamente (fallback textual). */
const KEYWORD_RULES: Array<{ pattern: RegExp; category: GoogleProductCategory }> = [
  { pattern: /protetor solar|bloqueador solar|fps/i, category: CATEGORY_SLUG_TO_GOOGLE['protecao-solar'] },
  { pattern: /shampoo|xamp|condicionador|capilar|cabelo/i, category: CATEGORY_SLUG_TO_GOOGLE['cuidados-capilares'] },
  { pattern: /maquiag|batom|rímel|rimel|sombra|blush|corretivo/i, category: CATEGORY_SLUG_TO_GOOGLE['maquiagens-e-acessorios'] },
  { pattern: /fralda|lenço umedecido|lenco umedecido/i, category: CATEGORY_SLUG_TO_GOOGLE['fraldas-e-lencos-umedecidos'] },
  { pattern: /pele|facial|hidratante|sérum|serum|tônico|tonico/i, category: CATEGORY_SLUG_TO_GOOGLE['cuidados-com-a-pele'] },
]

function sanitizeManualCategory(value: string): GoogleProductCategory | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  if (/^\d+$/.test(trimmed)) {
    return { id: trimmed, path: '' }
  }

  return { id: '', path: trimmed }
}

/**
 * Resolve a categoria Google para um produto seguindo, em ordem:
 * 1. Override manual salvo no produto (`products.google_product_category`)
 * 2. Categoria(s) da loja vinculada(s) ao produto
 * 3. Palavras-chave no nome/descrição
 * 4. Fallback genérico "Saúde e beleza"
 */
function categoryDepth(category: GoogleProductCategory): number {
  return category.path ? category.path.split('>').length : 1
}

export function resolveGoogleProductCategory(input: {
  manual?: string | null
  categorySlugs?: string[] | null
  text?: string | null
}): GoogleProductCategory {
  const manual = input.manual ? sanitizeManualCategory(input.manual) : null
  if (manual) return manual

  const candidates: GoogleProductCategory[] = []

  for (const slug of input.categorySlugs ?? []) {
    const match = CATEGORY_SLUG_TO_GOOGLE[slug]
    if (match) candidates.push(match)
  }

  const text = input.text ?? ''
  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(text)) candidates.push(rule.category)
  }

  if (candidates.length === 0) return DEFAULT_GOOGLE_PRODUCT_CATEGORY

  // Entre múltiplas categorias vinculadas ao produto, prioriza a mais específica
  // (maior profundidade na taxonomia) em vez de categorias genéricas como "Saúde e beleza".
  return candidates.reduce((best, current) =>
    categoryDepth(current) > categoryDepth(best) ? current : best
  )
}

/** Tag(s) XML `<g:google_product_category>` — ID OU caminho, nunca os dois. */
export function googleProductCategoryXmlValue(category: GoogleProductCategory): string {
  return category.id || category.path
}
