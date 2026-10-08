'use client'

import Link from 'next/link'
import { ChevronRight, ShieldCheck } from 'lucide-react'
import { PaymentDetailsTrigger } from '@/components/payment/PaymentDetailsModal'
import { ProductPurchaseBar } from '@/components/product/ProductPurchaseBar'
import { calcInstallmentDisplay } from '@/lib/payment/installments'
import { calcDiscountPercent, formatCurrency } from '@/lib/products/format'
import {
  DEFAULT_PAYMENT_SETTINGS,
  type PaymentMethodIcon,
  type PaymentSettings,
} from '@/types/payment'

type ProductBuyPanelProps = {
  productId: string
  productName: string
  stock: number
  price: number
  originalPrice: number | null
  brandName: string | null
  refCode: string | null
  storeName: string
  paymentSettings?: PaymentSettings | null
  paymentIcons?: PaymentMethodIcon[] | null
}

function getInstallmentBannerCopy(settings: PaymentSettings) {
  // Sem taxa → todas as parcelas até o máximo do admin são sem juros
  const interestFreeUpTo =
    settings.monthlyInterestRate <= 0
      ? settings.maxInstallments
      : settings.interestFreeInstallments

  if (interestFreeUpTo > 1) {
    return {
      count: interestFreeUpTo,
      interestFree: true as const,
    }
  }

  if (settings.maxInstallments > 1) {
    return {
      count: settings.maxInstallments,
      interestFree: false as const,
    }
  }

  return null
}

export function ProductBuyPanel({
  productId,
  productName,
  stock,
  price,
  originalPrice,
  brandName,
  refCode,
  storeName,
  paymentSettings,
  paymentIcons,
}: ProductBuyPanelProps) {
  const settings = paymentSettings ?? DEFAULT_PAYMENT_SETTINGS
  const icons = paymentIcons ?? []
  const hasDiscount = originalPrice != null && originalPrice > price
  const discount = calcDiscountPercent(price, originalPrice)
  const installment = calcInstallmentDisplay(price, settings)
  const banner = getInstallmentBannerCopy(settings)
  const brandHref = brandName
    ? `/busca?q=${encodeURIComponent(brandName)}`
    : null

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2 text-sm">
        {brandName && brandHref ? (
          <Link href={brandHref} className="font-medium text-brand hover:underline">
            Ver tudo da marca {brandName}
          </Link>
        ) : brandName ? (
          <span className="font-medium text-brand">Marca {brandName}</span>
        ) : (
          <span />
        )}
        {refCode && (
          <span className="text-xs text-text-muted md:text-sm">Ref: {refCode}</span>
        )}
      </div>

      {brandName && (
        <p className="text-lg font-bold uppercase tracking-wide text-text-primary md:text-xl">
          {brandName}
        </p>
      )}

      <h1 className="text-base font-medium leading-snug text-text-primary md:text-lg">
        {productName}
      </h1>

      <div className="space-y-1">
        {hasDiscount && (
          <p className="text-sm text-text-muted line-through">
            {formatCurrency(originalPrice!)}
          </p>
        )}
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
          <span className="text-3xl font-bold tabular-nums text-text-primary md:text-[2rem]">
            {formatCurrency(price)}
          </span>
        </p>
        {installment && installment.count > 1 && (
          <p className="text-sm text-text-secondary">
            ou {formatCurrency(installment.total)} em {installment.count}x de{' '}
            {formatCurrency(installment.value)} no cartão
          </p>
        )}
        {discount != null && (
          <p className="text-xs font-medium text-brand">Economize {discount}%</p>
        )}
      </div>

      {storeName.trim() && (
        <p className="flex flex-wrap items-center gap-1.5 text-sm text-text-secondary">
          <span>Vendido e entregue por</span>
          <ShieldCheck className="size-4 shrink-0 text-brand" aria-hidden />
          <span className="inline-flex items-center font-medium text-brand">
            {storeName}
            <ChevronRight className="size-4" aria-hidden />
          </span>
        </p>
      )}

      <ProductPurchaseBar productId={productId} stock={stock} />

      <PaymentDetailsTrigger
        price={price}
        paymentSettings={settings}
        paymentIcons={icons}
        layout="product"
      />

      {banner && (
        <div className="rounded border border-brand/40 px-4 py-3 text-center text-sm text-text-primary">
          Parcele em até{' '}
          <strong>
            {banner.count}x{banner.interestFree ? ' sem juros' : ''}
          </strong>
          {settings.minInstallmentValue > 0 && (
            <>
              {' '}
              com parcela mínima de <strong>{formatCurrency(settings.minInstallmentValue)}</strong>
            </>
          )}
          .
        </div>
      )}
    </div>
  )
}
