export function isPortugueseMobile(phone: string): boolean {
  return /^9\d{8}$/.test(phone)
}

export function formatMultibancoReference(reference: string): string {
  const digits = reference.replace(/\D/g, '')
  return digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim()
}

export const TRACKING_PARAM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'gclid',
  'ttclid',
  'src',
  'sck',
] as const

export function captureTrackingParameters(
  search: string = typeof window !== 'undefined' ? window.location.search : ''
): Record<string, string> {
  const params = new URLSearchParams(search)
  const out: Record<string, string> = {}
  for (const key of TRACKING_PARAM_KEYS) {
    const value = params.get(key)
    if (value) out[key] = value
  }
  return out
}
