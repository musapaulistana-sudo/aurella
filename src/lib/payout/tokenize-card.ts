export type PayoutEncryptCard = {
  number: string
  holderName: string
  expMonth: number | string
  expYear: number | string
  cvv: string
}

export type PayoutSdk = {
  publicKey: string | null
  setPublicKey: (key: string) => void | Promise<void>
  setTestMode: (enabled?: boolean) => void
  encrypt: (card: PayoutEncryptCard) => Promise<unknown>
}

declare global {
  interface Window {
    Payout?: PayoutSdk
  }
}

export const PAYOUT_JS_URL = 'https://api.payoutbr.com.br/v1/js'

export function getPayoutSdk(): PayoutSdk | null {
  if (typeof window === 'undefined') return null
  return window.Payout ?? null
}

export function extractCardHash(result: unknown): string | null {
  if (typeof result === 'string' && result.trim().length >= 10) {
    return result.trim()
  }

  if (!result || typeof result !== 'object') return null

  const record = result as Record<string, unknown>
  for (const key of ['hash', 'token', 'card_hash', 'cardHash'] as const) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length >= 10) {
      return value.trim()
    }
  }

  const nested = record.data
  if (nested && typeof nested === 'object') {
    return extractCardHash(nested)
  }

  return null
}

function firstStringMessage(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = firstStringMessage(item)
      if (nested) return nested
    }
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record.message === 'string' && record.message.trim()) return record.message.trim()
  }
  return null
}

export function extractPayoutErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === 'string' && payload.trim()) return payload.trim()
  if (!payload || typeof payload !== 'object') return fallback

  const record = payload as Record<string, unknown>
  return (
    firstStringMessage(record.message) ??
    firstStringMessage(record.error) ??
    firstStringMessage(record.errors) ??
    fallback
  )
}

/** Official PayoutBR JS SDK encryption (loads fingerprint + correct card-token payload). */
export async function encryptCardWithPayoutSdk(
  publicKey: string,
  card: {
    number: string
    holderName: string
    expirationMonth: string
    expirationYear: string
    cvv: string
  }
): Promise<string> {
  const payout = getPayoutSdk()
  if (!payout) {
    throw new Error('Biblioteca de pagamento não carregou. Recarregue a página.')
  }

  await payout.setPublicKey(publicKey)
  payout.setTestMode(!publicKey.includes('pk_live'))

  const names = card.holderName.trim().split(/\s+/).filter(Boolean)
  if (names.length < 2) {
    throw new Error('Informe o nome e sobrenome como no cartão')
  }

  const expMonth = Number(card.expirationMonth)
  const expYear = Number(card.expirationYear)
  if (!Number.isInteger(expMonth) || expMonth < 1 || expMonth > 12) {
    throw new Error('Mês de validade inválido')
  }
  if (!Number.isInteger(expYear) || String(expYear).length !== 4) {
    throw new Error('Ano de validade inválido')
  }

  const result = await payout.encrypt({
    number: card.number.replace(/\D/g, ''),
    holderName: card.holderName.trim(),
    expMonth,
    expYear,
    cvv: card.cvv,
  })

  const hash = extractCardHash(result)
  if (!hash) {
    throw new Error('Token do cartão inválido')
  }

  return hash
}
