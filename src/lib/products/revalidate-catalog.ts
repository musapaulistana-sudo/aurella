import { revalidatePath } from 'next/cache'

/** Invalida páginas públicas afetadas por alteração no catálogo. */
export function revalidateCatalogPaths(productSlug?: string | null) {
  revalidatePath('/feed/google-merchant')
  revalidatePath('/feed/google-merchant.xml')
  revalidatePath('/sitemap.xml')
  revalidatePath('/sitemap-products.xml')
  revalidatePath('/sitemap-collections.xml')
  revalidatePath('/sitemap-pages.xml')
  revalidatePath('/')
  revalidatePath('/busca')

  if (productSlug) {
    revalidatePath(`/produto/${productSlug}`)
  }
}

/** Invalida coleções públicas + sitemaps após criar/editar/remover categoria. */
export function revalidateCollectionPaths(categorySlug?: string | null) {
  revalidatePath('/sitemap.xml')
  revalidatePath('/sitemap-collections.xml')
  revalidatePath('/')
  revalidatePath('/feed/google-merchant')
  revalidatePath('/feed/google-merchant.xml')

  if (categorySlug) {
    revalidatePath(`/colecoes/${categorySlug}`)
  }
}

