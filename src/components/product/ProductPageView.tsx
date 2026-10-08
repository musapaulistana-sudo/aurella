import { ProductBreadcrumb } from '@/components/product/ProductBreadcrumb'
import { ProductBuyPanel } from '@/components/product/ProductBuyPanel'
import { ProductDetailTabs } from '@/components/product/ProductDetailTabs'
import { ProductGallery } from '@/components/product/ProductGallery'
import { ProductRelatedCarousel } from '@/components/product/ProductRelatedCarousel'
import { ProductShareBar } from '@/components/product/ProductShareBar'
import type { InstallmentByProductId } from '@/lib/payment/build-installment-map'
import { calcDiscountPercent } from '@/lib/products/format'
import type { SocialLink } from '@/types/layout'
import type {
  PaymentMethodIcon,
  PaymentSettings,
} from '@/types/payment'
import type { ProductCardData, ProductDetail } from '@/types/product'

type ProductPageViewProps = {
  product: ProductDetail
  storeName: string
  paymentSettings: PaymentSettings
  paymentIcons: PaymentMethodIcon[]
  socialLinks: SocialLink[]
  relatedProducts: ProductCardData[]
  relatedInstallments: InstallmentByProductId
}

export function ProductPageView({
  product,
  storeName,
  paymentSettings,
  paymentIcons,
  socialLinks,
  relatedProducts,
  relatedInstallments,
}: ProductPageViewProps) {
  const discount = calcDiscountPercent(product.price, product.original_price)
  const refCode = product.sku ?? product.gtin

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-5 md:px-6 md:py-8">
      <ProductBreadcrumb categories={product.categories} productName={product.name} />

      {/*
        Mobile: carrossel → compra → descrição
        Desktop: esquerda (galeria + descrição) | direita sticky (compra)
      */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:gap-12">
        <div className="order-1 min-w-0">
          <ProductGallery
            images={product.images}
            productName={product.name}
            discountPercent={discount}
            productId={product.id}
          />
        </div>

        <aside className="order-2 lg:sticky lg:top-28 lg:row-span-2 lg:self-start">
          <ProductBuyPanel
            productId={product.id}
            productName={product.name}
            stock={product.stock}
            price={product.price}
            originalPrice={product.original_price}
            brandName={product.brandName}
            refCode={refCode}
            storeName={storeName}
            paymentSettings={paymentSettings}
            paymentIcons={paymentIcons}
          />

          <div className="mt-6">
            <ProductShareBar productName={product.name} socialLinks={socialLinks} />
          </div>
        </aside>

        <div className="order-3 min-w-0 lg:col-start-1">
          <ProductDetailTabs description={product.description} />
        </div>
      </div>

      <div id="produtos-relacionados">
        <ProductRelatedCarousel
          products={relatedProducts}
          installments={relatedInstallments}
        />
      </div>
    </div>
  )
}
