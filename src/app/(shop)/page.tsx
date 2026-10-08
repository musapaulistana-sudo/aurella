import type { Metadata } from 'next'
import { Fragment } from 'react'
import { CategoryGrid } from '@/components/collection/CategoryGrid'
import { HomeBannerCarousel } from '@/components/home/HomeBannerCarousel'
import { HomeNewsletterBar } from '@/components/home/HomeNewsletterBar'
import {
  StoreInfoCarousel,
  type StoreInfoItem,
} from '@/components/home/StoreInfoCarousel'
import { ProductCarouselSection } from '@/components/home/ProductCarouselSection'
import { getHomeBannersPublic, splitBannersByDevice } from '@/lib/banners/queries'
import { getCollectionsForCarousel } from '@/lib/collections/queries'
import { getHomeCategorySections } from '@/lib/home/queries'
import { buildInstallmentMap } from '@/lib/payment/build-installment-map'
import { getPaymentSettings } from '@/lib/payment/queries'
import { getSeoSettings } from '@/lib/seo/get-seo-settings'
import { buildPageMetadata } from '@/lib/seo/metadata'

const STORE_INFO_ITEMS: StoreInfoItem[] = [
  {
    id: 'shipping',
    title: 'ENTREGA EM PORTUGAL',
    text: 'Entrega rápida e segura',
    icon: 'truck',
  },
  {
    id: 'installments',
    title: 'Pague em prestações',
    text: 'Prestações no cartão de crédito',
    icon: 'credit-card',
  },
  {
    id: 'contact',
    title: 'Contacte-nos',
    text: 'Apoio ao cliente dedicado',
    icon: 'headphones',
  },
  {
    id: 'security',
    title: 'Site seguro',
    text: 'Dados protegidos',
    icon: 'shield',
  },
]

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings()
  return buildPageMetadata({
    title: { absolute: seo.defaultTitle },
    description: seo.description,
    path: '/',
    imageUrl: seo.ogImageUrl,
    imageAlt: seo.siteName,
  })
}

export default async function HomePage() {
  const [banners, collections, categorySections, paymentSettings] = await Promise.all([
    getHomeBannersPublic(),
    getCollectionsForCarousel(),
    getHomeCategorySections(),
    getPaymentSettings(),
  ])

  const { desktop: desktopBanners, mobile: mobileBanners } = splitBannersByDevice(banners)
  const allProducts = categorySections.flatMap((section) => section.products)
  const installments = buildInstallmentMap(allProducts, paymentSettings)
  const skinCareSectionIndex = categorySections.findIndex(
    (section) =>
      section.slug === 'cuidados-com-a-pele' ||
      section.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .includes('cuidados com a pele')
  )
  return (
    <>
      <div className="bg-surface">
        <HomeBannerCarousel banners={desktopBanners} className="hidden md:block" />
        <HomeBannerCarousel banners={mobileBanners} className="md:hidden" />
        <HomeNewsletterBar />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <section className="mb-12">
          <h2 className="section-title">Compre por categoria</h2>
          <CategoryGrid items={collections} />
        </section>

        {categorySections.map((section, index) => (
          <Fragment key={section.id}>
            <ProductCarouselSection
              title={section.name}
              viewAllHref={`/colecoes/${section.slug}`}
              products={section.products}
              installments={installments}
            />
            {index === skinCareSectionIndex && (
              <div className="mb-12">
                <StoreInfoCarousel items={STORE_INFO_ITEMS} />
              </div>
            )}
          </Fragment>
        ))}

        {skinCareSectionIndex === -1 && (
          <div className="mb-12">
            <StoreInfoCarousel items={STORE_INFO_ITEMS} />
          </div>
        )}
      </div>
    </>
  )
}
