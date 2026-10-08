import { absoluteUrl } from '@/lib/seo/site-url'
import { buildPriceValidUntil } from '@/lib/seo/json-ld/merchant-schemas'
import type { ProductDetail } from '@/types/product'

function formatSchemaPrice(price: number): string {
  return price.toFixed(2)
}

function availabilityUrl(stock: number): string {
  return stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function buildProductJsonLd(product: ProductDetail) {
  const url = absoluteUrl(`/produto/${product.slug}`)
  if (!url) return null

  const images = product.images.map((img) => img.url).filter(Boolean)
  const rawDescription =
    product.meta_description?.trim() ||
    product.description?.trim()?.slice(0, 5000) ||
    product.name
  const description = stripHtml(rawDescription) || product.name

  const offer: Record<string, unknown> = {
    '@type': 'Offer',
    url,
    priceCurrency: 'EUR',
    price: formatSchemaPrice(product.price),
    availability: availabilityUrl(product.stock),
    itemCondition: 'https://schema.org/NewCondition',
    priceValidUntil: buildPriceValidUntil(),
  }

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description,
    url,
    sku: product.sku ?? undefined,
    image: images.length > 0 ? images : undefined,
    offers: offer,
  }

  if (product.gtin) {
    jsonLd.gtin = product.gtin
  }

  if (product.brandName) {
    jsonLd.brand = {
      '@type': 'Brand',
      name: product.brandName,
    }
  }

  return jsonLd
}
