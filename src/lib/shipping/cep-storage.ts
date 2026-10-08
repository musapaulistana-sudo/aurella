export const CEP_STORAGE_KEY = 'loja-codigo-postal-v1'

/** Formata código postal português: 1234-567 */
export function formatCep(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 7)
  if (digits.length <= 4) return digits
  return `${digits.slice(0, 4)}-${digits.slice(4)}`
}

export function readStoredCep(): string {
  if (typeof window === 'undefined') return ''
  try {
    return localStorage.getItem(CEP_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function writeStoredCep(cep: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CEP_STORAGE_KEY, cep)
  } catch {
    // ignore
  }
}

export function isValidPostalCode(value: string): boolean {
  return value.replace(/\D/g, '').length === 7
}
