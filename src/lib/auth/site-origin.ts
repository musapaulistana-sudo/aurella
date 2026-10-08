import { getSiteUrl } from '@/lib/seo/site-url'

/** Domínio canônico da loja (Auth e-mails / redirects). */
export const CANONICAL_SITE_URL = 'https://www.atlascosmeticos.com'

function normalizeOrigin(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim().replace(/\/+$/, '')
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.origin
  } catch {
    return null
  }
}

/** Hosts que não devem aparecer em e-mails Auth (preview / infra). */
function isNonStoreHost(origin: string): boolean {
  try {
    const host = new URL(origin).hostname.toLowerCase()
    return (
      host.endsWith('.vercel.app') ||
      host.endsWith('.supabase.co') ||
      host === 'localhost' ||
      host === '127.0.0.1'
    )
  } catch {
    return true
  }
}

/**
 * Origem da loja para redirects Auth.
 * Prefere NEXT_PUBLIC_SITE_URL; ignora vercel.app/supabase; fallback canônico.
 */
export function getAuthSiteOrigin(request?: Request): string {
  const fromEnv = normalizeOrigin(getSiteUrl())
  if (fromEnv && !isNonStoreHost(fromEnv)) return fromEnv

  if (request) {
    const fromOrigin = normalizeOrigin(request.headers.get('origin'))
    if (fromOrigin && !isNonStoreHost(fromOrigin)) return fromOrigin

    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
    const proto = request.headers.get('x-forwarded-proto') ?? 'https'
    if (host) {
      const fromHost = normalizeOrigin(`${proto}://${host}`)
      if (fromHost && !isNonStoreHost(fromHost)) return fromHost
    }
  }

  return CANONICAL_SITE_URL
}
