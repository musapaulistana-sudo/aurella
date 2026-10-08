import { toStoreMediaPath, toStoreMediaUrl } from '@/lib/media/store-media-url'

export type PrimaryProductImage = {
  url: string | null
  alt: string | null
}

function readMedia(media: unknown): { public_url: string; alt_text: string | null } | null {
  if (!media || typeof media !== 'object') return null

  if (Array.isArray(media)) {
    for (const item of media) {
      const parsed = readMedia(item)
      if (parsed?.public_url) return parsed
    }
    return null
  }

  const publicUrl = 'public_url' in media && typeof media.public_url === 'string' ? media.public_url : null
  if (!publicUrl) return null

  const altText =
    'alt_text' in media && (typeof media.alt_text === 'string' || media.alt_text === null)
      ? media.alt_text
      : null

  return { public_url: publicUrl, alt_text: altText }
}

/** Preferência: caminho /cdn/... no domínio da loja; fallback: URL do Storage. */
function resolveDisplayUrl(storageUrl: string): string {
  return toStoreMediaPath(storageUrl) ?? storageUrl
}

export function getPrimaryProductImage(
  productImages: unknown,
  fallbackAlt?: string
): PrimaryProductImage {
  if (!Array.isArray(productImages)) {
    return { url: null, alt: fallbackAlt ?? null }
  }

  const sorted = [...productImages].sort((a, b) => {
    const aOrder =
      a && typeof a === 'object' && 'sort_order' in a ? Number(a.sort_order) : 0
    const bOrder =
      b && typeof b === 'object' && 'sort_order' in b ? Number(b.sort_order) : 0
    return aOrder - bOrder
  })

  for (const item of sorted) {
    if (!item || typeof item !== 'object' || !('media' in item)) continue
    const media = readMedia(item.media)
    if (media?.public_url) {
      return {
        url: resolveDisplayUrl(media.public_url),
        alt: media.alt_text ?? fallbackAlt ?? null,
      }
    }
  }

  return { url: null, alt: fallbackAlt ?? null }
}

/**
 * URLs absolutas no domínio da loja para o feed Merchant (image_link).
 * Fallback para a URL do Supabase se não houver SITE_URL / rewrite.
 */
export function getAllProductImageUrls(productImages: unknown): string[] {
  if (!Array.isArray(productImages)) return []

  const sorted = [...productImages].sort((a, b) => {
    const aOrder =
      a && typeof a === 'object' && 'sort_order' in a ? Number(a.sort_order) : 0
    const bOrder =
      b && typeof b === 'object' && 'sort_order' in b ? Number(b.sort_order) : 0
    return aOrder - bOrder
  })

  const urls: string[] = []
  for (const item of sorted) {
    if (!item || typeof item !== 'object' || !('media' in item)) continue
    const media = readMedia(item.media)
    if (!media?.public_url) continue
    const absolute = toStoreMediaUrl(media.public_url)
    if (absolute) urls.push(absolute)
  }
  return urls
}

export function readBrandName(brand: unknown): string | null {
  if (!brand || typeof brand !== 'object' || !('name' in brand)) return null
  return typeof brand.name === 'string' ? brand.name : null
}
