import { getSiteUrl } from '@/lib/seo/site-url'

/**
 * Converte URL pública do Supabase Storage para caminho no domínio da loja.
 * Ex.: https://xxx.supabase.co/storage/v1/object/public/product-images/a.webp
 *   → /cdn/product-images/a.webp
 *
 * O rewrite em next.config encaminha /cdn/* para o Storage.
 */
export function toStoreMediaPath(url: string | null | undefined): string | null {
  if (!url?.trim()) return null

  const trimmed = url.trim()
  if (trimmed.startsWith('/cdn/')) return trimmed

  const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')
  if (!supabaseBase) return null

  const prefix = `${supabaseBase}/storage/v1/object/public/`
  if (!trimmed.startsWith(prefix)) return null

  const storagePath = trimmed.slice(prefix.length)
  if (!storagePath) return null

  return `/cdn/${storagePath}`
}

/** URL absoluta no domínio da loja (feed Merchant, OG, etc.). Fallback: URL original. */
export function toStoreMediaUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null

  const path = toStoreMediaPath(url)
  if (!path) return url.trim()

  const site = getSiteUrl()
  if (!site) return path

  return `${site}${path}`
}
