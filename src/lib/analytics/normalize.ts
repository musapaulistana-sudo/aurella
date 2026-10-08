/**
 * Normalização de IDs de analytics (Google Tag / GA4 / Ads / Clarity).
 * Valores inválidos ou vazios viram null — nunca quebram a página.
 */

function stripNoise(raw: string): string {
  return raw.replace(/[\u200B-\u200D\uFEFF]/g, '').trim()
}

/** Escapa string para uso seguro em JS inline. */
export function escapeJsString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

/** Google Tag: GT-… ou G-… */
export function normalizeGoogleTagId(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const cleaned = stripNoise(raw).replace(/\s+/g, '')
  if (!cleaned) return null
  const upper = cleaned.toUpperCase()
  if (/^GT-[A-Z0-9]+$/.test(upper)) return upper
  if (/^G-[A-Z0-9]+$/.test(upper)) return upper
  return null
}

/** GA4: G-… */
export function normalizeGa4Id(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const cleaned = stripNoise(raw).replace(/\s+/g, '')
  if (!cleaned) return null
  const upper = cleaned.toUpperCase()
  if (/^G-[A-Z0-9]+$/.test(upper)) return upper
  return null
}

/** Google Ads: AW-… */
export function normalizeGoogleAdsId(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const cleaned = stripNoise(raw).replace(/\s+/g, '')
  if (!cleaned) return null
  const upper = cleaned.toUpperCase()
  if (/^AW-[0-9]+$/.test(upper)) return upper
  return null
}

/** Conversão Ads: AW-XXXX/label */
export function normalizeGoogleAdsConversion(
  raw: string | null | undefined
): string | null {
  if (raw == null) return null
  const cleaned = stripNoise(raw).replace(/\s+/g, '')
  if (!cleaned) return null
  const match = cleaned.match(/^(AW-\d+)\/([A-Za-z0-9_-]+)$/i)
  if (!match) return null
  return `${match[1]!.toUpperCase()}/${match[2]}`
}

/**
 * Clarity: aceita ID puro ou snippet/HTML/URL e extrai só o project ID.
 */
export function normalizeClarityId(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const cleaned = stripNoise(raw)
  if (!cleaned) return null

  // URL ou src: https://www.clarity.ms/tag/xxxxxxxx
  const fromUrl = cleaned.match(/clarity\.ms\/tag\/([A-Za-z0-9]+)/i)
  if (fromUrl?.[1]) return fromUrl[1]

  // clarity("set", ...) snippets with project id as last arg to loader
  const fromLoader = cleaned.match(
    /\(\s*window\s*,\s*document\s*,\s*["']clarity["']\s*,\s*["']script["']\s*,\s*["']([A-Za-z0-9]+)["']\s*\)/i
  )
  if (fromLoader?.[1]) return fromLoader[1]

  // projectId: "xxxx" / 'xxxx'
  const fromProjectId = cleaned.match(/projectId["']?\s*[:=]\s*["']([A-Za-z0-9]+)["']/i)
  if (fromProjectId?.[1]) return fromProjectId[1]

  // ID puro (sem espaços / HTML)
  if (/^[A-Za-z0-9]{6,20}$/.test(cleaned) && !cleaned.includes('<') && !cleaned.includes(' ')) {
    return cleaned
  }

  // Última tentativa: token alfanumérico curto em texto colado
  const tokens = cleaned.match(/\b([A-Za-z0-9]{8,12})\b/g)
  if (tokens?.length === 1) return tokens[0]!

  return null
}

export type StoreAnalyticsInput = {
  google_tag_manager_id?: string | null
  google_analytics_id?: string | null
  google_ads_id?: string | null
  google_ads_conversion_id?: string | null
  microsoft_clarity_id?: string | null
}

export type ResolvedAnalyticsConfig = {
  googleTagId: string | null
  ga4Id: string | null
  googleAdsId: string | null
  googleAdsConversion: string | null
  clarityId: string | null
  /** IDs únicos para gtag('config') — Tag, GA4, Ads */
  gtagConfigIds: string[]
  /** Primeiro ID Google para carregar gtag.js */
  gtagPrimaryId: string | null
  hasGoogle: boolean
  hasClarity: boolean
  hasAny: boolean
}

export function resolveAnalyticsConfig(input: StoreAnalyticsInput): ResolvedAnalyticsConfig {
  const googleTagId = normalizeGoogleTagId(input.google_tag_manager_id)
  const ga4Id = normalizeGa4Id(input.google_analytics_id)
  const googleAdsConversion = normalizeGoogleAdsConversion(input.google_ads_conversion_id)
  const adsFromConversion = googleAdsConversion
    ? normalizeGoogleAdsId(googleAdsConversion.split('/')[0] ?? null)
    : null
  const googleAdsId = normalizeGoogleAdsId(input.google_ads_id) ?? adsFromConversion
  const clarityId = normalizeClarityId(input.microsoft_clarity_id)

  const gtagConfigIds = [...new Set([googleTagId, ga4Id, googleAdsId].filter(Boolean) as string[])]
  const gtagPrimaryId = gtagConfigIds[0] ?? null

  return {
    googleTagId,
    ga4Id,
    googleAdsId,
    googleAdsConversion,
    clarityId,
    gtagConfigIds,
    gtagPrimaryId,
    hasGoogle: gtagConfigIds.length > 0,
    hasClarity: Boolean(clarityId),
    hasAny: gtagConfigIds.length > 0 || Boolean(clarityId),
  }
}

/** Normaliza campos antes de salvar no admin (ignora inválidos → null). */
export function normalizeAnalyticsFieldsForSave(input: StoreAnalyticsInput): {
  google_tag_manager_id: string | null
  google_analytics_id: string | null
  google_ads_id: string | null
  google_ads_conversion_id: string | null
  microsoft_clarity_id: string | null
} {
  return {
    google_tag_manager_id: normalizeGoogleTagId(input.google_tag_manager_id),
    google_analytics_id: normalizeGa4Id(input.google_analytics_id),
    google_ads_id: normalizeGoogleAdsId(input.google_ads_id),
    google_ads_conversion_id: normalizeGoogleAdsConversion(input.google_ads_conversion_id),
    microsoft_clarity_id: normalizeClarityId(input.microsoft_clarity_id),
  }
}
