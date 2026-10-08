'use client'

import { usePathname } from 'next/navigation'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { CookieConsentBar } from '@/components/layout/CookieConsentBar'
import { Footer } from '@/components/layout/Footer'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { TopBar } from '@/components/layout/TopBar'
import { JsonLd } from '@/components/seo/JsonLd'
import type { FooterData } from '@/lib/layout/get-footer-data'
import type { SiteLayoutData } from '@/types/layout'

type SiteLayoutChromeProps = {
  children: React.ReactNode
  layoutData: SiteLayoutData
  footerData: FooterData
  structuredData: Record<string, unknown>[] | null
}

const HIDE_HEADER_PATHS = ['/checkout']

function shouldHideHeader(pathname: string): boolean {
  return HIDE_HEADER_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
}

export function SiteLayoutChrome({
  children,
  layoutData,
  footerData,
  structuredData,
}: SiteLayoutChromeProps) {
  const pathname = usePathname()
  const hideHeader = shouldHideHeader(pathname)

  return (
    <div className="flex min-h-full flex-col">
      <JsonLd data={structuredData} />
      {!hideHeader && (
        <>
          <TopBar
            policyLinks={layoutData.policyLinks}
            socialLinks={layoutData.socialLinks}
            shippingPromoText={layoutData.shippingPromoText}
          />
          <SiteHeader
            storeName={layoutData.storeName}
            logo={layoutData.logo}
            menuCategories={layoutData.menuCategories}
            phone={layoutData.phone}
            helpLink={layoutData.helpLink}
            shippingPromoText={layoutData.shippingPromoText}
          />
        </>
      )}
      <main className="flex-1">{children}</main>
      <Footer footerData={footerData} />
      <CartDrawer />
      {!hideHeader && <CookieConsentBar />}
    </div>
  )
}
