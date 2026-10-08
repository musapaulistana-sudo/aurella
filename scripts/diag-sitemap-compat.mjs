/**
 * Compara sitemap/feed ao vivo com categorias e produtos ativos no Supabase.
 * Uso: node --env-file=.env.local scripts/diag-sitemap-compat.mjs
 */
import { createClient } from '@supabase/supabase-js'

const SITE = 'https://www.atlascosmeticos.com'
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing SUPABASE env')
  process.exit(1)
}

const sb = createClient(url, key)

async function fetchXml(path) {
  const r = await fetch(`${SITE}${path}`, { redirect: 'follow' })
  const text = await r.text()
  const locs = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  return { status: r.status, locs, text }
}

function slugFromCollectionUrl(loc) {
  const m = loc.match(/\/colecoes\/([^/?#]+)/)
  return m ? m[1] : null
}

function slugFromProductUrl(loc) {
  const m = loc.match(/\/produto\/([^/?#]+)/)
  return m ? m[1] : null
}

const [{ data: cats }, { data: prods }, index, collections, products, feed] =
  await Promise.all([
    sb.from('categories').select('slug, active, name'),
    sb.from('products').select('slug, active').limit(5000),
    fetchXml('/sitemap.xml'),
    fetchXml('/sitemap-collections.xml'),
    fetchXml('/sitemap-products.xml'),
    fetchXml('/feed/google-merchant.xml'),
  ])

const activeCats = (cats ?? []).filter((c) => c.active)
const inactiveCats = (cats ?? []).filter((c) => !c.active)
const activeProds = (prods ?? []).filter((p) => p.active)
const inactiveProds = (prods ?? []).filter((p) => !p.active)

const sitemapCatSlugs = collections.locs
  .map(slugFromCollectionUrl)
  .filter(Boolean)
  .sort()
const dbCatSlugs = activeCats.map((c) => c.slug).sort()

const sitemapProdSlugs = products.locs
  .map(slugFromProductUrl)
  .filter(Boolean)
  .sort()
const dbProdSlugs = activeProds.map((p) => p.slug).sort()

const feedItemCount = (feed.text.match(/<item>/g) ?? []).length
const feedExtra = (feed.text.match(/g:id/g) ?? []).length

const onlyInSitemapCats = sitemapCatSlugs.filter((s) => !dbCatSlugs.includes(s))
const onlyInDbCats = dbCatSlugs.filter((s) => !sitemapCatSlugs.includes(s))
const onlyInSitemapProds = sitemapProdSlugs.filter((s) => !dbProdSlugs.includes(s))
const onlyInDbProds = dbProdSlugs.filter((s) => !sitemapProdSlugs.includes(s))

const suplementosStatus = await fetch(`${SITE}/colecoes/suplementos-e-vitaminas`, {
  redirect: 'manual',
})

console.log(
  JSON.stringify(
    {
      live: {
        sitemapIndex: { status: index.status, children: index.locs },
        collections: { status: collections.status, count: sitemapCatSlugs.length, slugs: sitemapCatSlugs },
        products: { status: products.status, count: sitemapProdSlugs.length },
        feed: { status: feed.status, items: feedItemCount, gIds: feedExtra },
        suplementosPageStatus: suplementosStatus.status,
      },
      db: {
        categories: { active: activeCats.length, inactive: inactiveCats.length, activeSlugs: dbCatSlugs },
        products: { active: activeProds.length, inactive: inactiveProds.length },
      },
      diff: {
        collectionsOnlyInSitemap: onlyInSitemapCats,
        collectionsOnlyInDb: onlyInDbCats,
        productsOnlyInSitemap: onlyInSitemapProds.slice(0, 20),
        productsOnlyInDb: onlyInDbProds.slice(0, 20),
        productsOnlyInSitemapCount: onlyInSitemapProds.length,
        productsOnlyInDbCount: onlyInDbProds.length,
        feedMatchesActiveProducts: feedItemCount === activeProds.length,
        sitemapProductsMatchActive: sitemapProdSlugs.length === activeProds.length && onlyInSitemapProds.length === 0,
        sitemapCollectionsMatchActive:
          sitemapCatSlugs.length === activeCats.length && onlyInSitemapCats.length === 0,
      },
    },
    null,
    2,
  ),
)
