import { createPublicClient, isSupabasePublicConfigured } from '@/lib/supabase/public'
import {
  getAllProductImageUrls,
  getPrimaryProductImage,
  readBrandName,
} from '@/lib/products/product-images'
import { absoluteUrl } from '@/lib/seo/site-url'
import { resolveGoogleProductCategory, googleProductCategoryXmlValue } from '@/lib/feed/google-product-category'

const FEED_PRODUCT_SELECT = `
  id, name, slug, description, price, stock, sku, gtin, google_product_category, updated_at,
  brand:brands(name),
  product_categories(categories(name, slug)),
  product_images(sort_order, media:media_assets(public_url, alt_text))
`

/** Máximo de imagens adicionais aceito pelo Merchant Center (a primeira já vai em image_link). */
const MAX_ADDITIONAL_IMAGES = 10

type FeedProductRow = {
  id: string
  name: string
  slug: string
  description: string | null
  price: number | string
  stock: number
  sku: string | null
  gtin: string | null
  google_product_category: string | null
  updated_at: string
  brand: unknown
  product_categories: Array<{ categories: { name: string; slug: string } | null }> | null
  product_images: unknown
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** GTIN válido para o Merchant Center: somente dígitos, 8/12/13/14 caracteres. */
function sanitizeGtin(value: string | null): string | null {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  return [8, 12, 13, 14].includes(digits.length) ? digits : null
}

function xmlTag(tag: string, value: string | number | null | undefined, escape = true): string {
  if (value === null || value === undefined || value === '') return ''
  const content = escape ? escapeXml(String(value)) : String(value)
  return `<${tag}>${content}</${tag}>`
}

export async function buildGoogleMerchantFeedXml(): Promise<
  { xml: string } | { error: string; status: number }
> {
  const siteBase = absoluteUrl('/')
  if (!siteBase) {
    return { error: 'NEXT_PUBLIC_SITE_URL não configurada', status: 503 }
  }

  if (!isSupabasePublicConfigured()) {
    return { error: 'Supabase não configurado', status: 503 }
  }

  const supabase = createPublicClient()
  const { data: products } = await supabase
    .from('products')
    .select(FEED_PRODUCT_SELECT)
    .eq('active', true)
    .order('updated_at', { ascending: false })

  const items = ((products ?? []) as unknown as FeedProductRow[]).map((row) => {
    const allImages = getAllProductImageUrls(row.product_images)
    const primaryImage =
      allImages[0] ?? getPrimaryProductImage(row.product_images, row.name).url ?? ''
    const additionalImages = allImages.slice(1, 1 + MAX_ADDITIONAL_IMAGES)

    const link = absoluteUrl(`/produto/${row.slug}`) ?? ''
    const brand = readBrandName(row.brand)
    const description = stripHtml(row.description ?? row.name).slice(0, 5000)
    const availability = row.stock > 0 ? 'in_stock' : 'out_of_stock'
    const price = `${Number(row.price).toFixed(2)} EUR`

    const categoryNames = (row.product_categories ?? [])
      .map((pc) => pc.categories?.name)
      .filter((name): name is string => Boolean(name))
    const categorySlugs = (row.product_categories ?? [])
      .map((pc) => pc.categories?.slug)
      .filter((slug): slug is string => Boolean(slug))

    const googleCategory = resolveGoogleProductCategory({
      manual: row.google_product_category,
      categorySlugs,
      text: `${row.name} ${row.description ?? ''}`,
    })

    const gtin = sanitizeGtin(row.gtin)
    const hasIdentifier = Boolean(gtin || row.sku)

    return `
    <item>
      ${xmlTag('g:id', row.id)}
      ${xmlTag('title', row.name)}
      ${xmlTag('description', description)}
      ${xmlTag('link', link)}
      ${primaryImage ? xmlTag('g:image_link', primaryImage) : ''}
      ${additionalImages.map((url) => xmlTag('g:additional_image_link', url)).join('\n      ')}
      ${xmlTag('g:availability', availability)}
      ${xmlTag('g:price', price, false)}
      ${xmlTag('g:condition', 'new')}
      ${brand ? xmlTag('g:brand', brand) : ''}
      ${gtin ? xmlTag('g:gtin', gtin) : ''}
      ${row.sku ? xmlTag('g:mpn', row.sku) : ''}
      ${xmlTag('g:identifier_exists', hasIdentifier ? 'yes' : 'no')}
      ${xmlTag('g:google_product_category', googleProductCategoryXmlValue(googleCategory))}
      ${categoryNames.map((name) => xmlTag('g:product_type', name)).join('\n      ')}
    </item>`
  })

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml('Catálogo de produtos')}</title>
    <link>${escapeXml(siteBase)}</link>
    <description>Feed de produtos para Google Merchant Center</description>
    ${items.join('\n')}
  </channel>
</rss>`

  return { xml }
}
