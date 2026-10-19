import type { ImageLoaderProps } from 'next/image'

/**
 * URLs Shopify mortas ainda podem servir via cache do /_next/image em algumas
 * larguras (ex. 1200) e falhar noutras (750/828) — daí o bug do resize.
 * Para Shopify usamos sempre w=1200 para estabilizar em todos os dispositivos.
 */
export function productImageLoader({ src, width, quality }: ImageLoaderProps): string {
  const q = quality ?? 75
  const w = src.includes('cdn.shopify.com') ? 1200 : width
  return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=${q}`
}

export function needsStableShopifyLoader(src: string): boolean {
  return src.includes('cdn.shopify.com')
}
