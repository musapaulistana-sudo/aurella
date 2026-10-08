import { SiteLayoutChrome } from '@/components/layout/SiteLayoutChrome'
import { getFooterData } from '@/lib/layout/get-footer-data'
import { getSiteLayoutData } from '@/lib/layout/get-site-layout-data'
import { buildStoreJsonLd } from '@/lib/seo/json-ld/store'
import { buildWebsiteJsonLd } from '@/lib/seo/json-ld/website'
import { getPublicStoreProfile } from '@/lib/store-profile/public'

type SiteLayoutProps = {
  children: React.ReactNode
}

export async function SiteLayout({ children }: SiteLayoutProps) {
  const [layoutData, footerData, storeProfile] = await Promise.all([
    getSiteLayoutData(),
    getFooterData(),
    getPublicStoreProfile(),
  ])

  const storeJsonLd = buildStoreJsonLd({
    layout: layoutData,
    footer: footerData,
    profile: storeProfile,
  })
  const websiteJsonLd = buildWebsiteJsonLd({
    storeName: layoutData.storeName || footerData.legal.storeName,
  })

  const globalStructuredData = [storeJsonLd, websiteJsonLd].filter(
    Boolean
  ) as Record<string, unknown>[]

  return (
    <SiteLayoutChrome
      layoutData={layoutData}
      footerData={footerData}
      structuredData={globalStructuredData.length > 0 ? globalStructuredData : null}
    >
      {children}
    </SiteLayoutChrome>
  )
}
