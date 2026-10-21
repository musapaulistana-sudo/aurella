/**
 * Medida de preço unitário para o Google Merchant (UE / PT).
 * Extrai volume ou peso do título (ex.: "50 ml", "1 kg", "18ML+2ML", "2x50ml").
 */

export type UnitPricing = {
  /** g:unit_pricing_measure — quantidade total do produto */
  measure: string
  /** g:unit_pricing_base_measure — denominador do preço unitário */
  base: string
}

type Family = 'volume' | 'mass'

const UNIT_RE =
  /(?:(\d+(?:[.,]\d+)?)\s*[x×]\s*)?(\d+(?:[.,]\d+)?)\s*(ml|cl|kg|mg|g|l)\b/gi

function toNumber(raw: string): number {
  return Number(raw.replace(',', '.'))
}

function toMl(amount: number, unit: string): number {
  if (unit === 'l') return amount * 1000
  if (unit === 'cl') return amount * 10
  return amount
}

function toGrams(amount: number, unit: string): number {
  if (unit === 'kg') return amount * 1000
  if (unit === 'mg') return amount / 1000
  return amount
}

function formatQty(amount: number): string {
  const rounded = Math.round(amount * 100) / 100
  if (Number.isInteger(rounded)) return String(rounded)
  return rounded.toFixed(2).replace(/\.?0+$/, '')
}

function formatVolume(ml: number): UnitPricing {
  if (ml >= 1000) {
    return { measure: `${formatQty(ml / 1000)} l`, base: '1 l' }
  }
  return { measure: `${formatQty(ml)} ml`, base: '100 ml' }
}

function formatMass(grams: number): UnitPricing {
  if (grams >= 1000) {
    return { measure: `${formatQty(grams / 1000)} kg`, base: '1 kg' }
  }
  return { measure: `${formatQty(grams)} g`, base: '100 g' }
}

/** Devolve a medida total e a base, ou null se o título não tiver volume/peso. */
export function parseUnitPricing(name: string): UnitPricing | null {
  const volumes: number[] = []
  const masses: number[] = []

  for (const match of name.matchAll(UNIT_RE)) {
    const pack = match[1] ? toNumber(match[1]) : 1
    const amount = toNumber(match[2] ?? '')
    const unit = (match[3] ?? '').toLowerCase()
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(pack) || pack <= 0) continue

    const total = amount * pack
    if (unit === 'ml' || unit === 'cl' || unit === 'l') volumes.push(toMl(total, unit))
    else masses.push(toGrams(total, unit))
  }

  const family: Family | null =
    volumes.length > 0 ? 'volume' : masses.length > 0 ? 'mass' : null
  if (!family) return null

  const total = (family === 'volume' ? volumes : masses).reduce((sum, n) => sum + n, 0)
  if (!Number.isFinite(total) || total <= 0) return null

  return family === 'volume' ? formatVolume(total) : formatMass(total)
}
