'use client'

import Image from 'next/image'
import Link from 'next/link'
import { IconBag } from '@/components/icons/DotIcons'
import { FavoriteButton } from '@/components/product/FavoriteButton'
import { calcDiscountPercent, formatCurrency } from '@/lib/products/format'
import type { InstallmentDisplay } from '@/types/payment'
import type { ProductCardData } from '@/types/product'

type ProductCardProps = {
  product: ProductCardData
  installment?: InstallmentDisplay | null
}

export function ProductCard({ product, installment }: ProductCardProps) {
  const discount = calcDiscountPercent(product.price, product.originalPrice)
  const hasDiscount = product.originalPrice != null && product.originalPrice > product.price
  const productHref = `/produto/${product.slug}`

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl bg-surface p-3 shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] md:p-4">
      <div className="relative mb-3 aspect-square overflow-hidden rounded-lg bg-white">
        <Link href={productHref} className="relative block h-full w-full">
          {discount != null && (
            <span className="absolute left-2 top-2 z-10 flex size-12 flex-col items-center justify-center rounded-full bg-[#1a2744] text-center leading-none text-white shadow-sm md:size-14">
              <span className="text-[11px] font-bold md:text-xs">{discount}%</span>
              <span className="text-[8px] font-bold uppercase tracking-wide md:text-[9px]">
                Off
              </span>
            </span>
          )}
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.imageAlt ?? product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03] md:p-4"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-text-muted">
              Sem imagem
            </div>
          )}
        </Link>

        <FavoriteButton
          productId={product.id}
          variant="card"
          className="absolute bottom-2 left-2 z-10"
        />
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {product.brandName && (
          <p className="text-[11px] font-bold uppercase tracking-wide text-text-primary md:text-xs">
            {product.brandName}
          </p>
        )}

        <Link href={productHref} className="block">
          <h3 className="line-clamp-2 min-h-[2.4em] text-[13px] leading-snug text-text-secondary md:text-sm">
            {product.name}
          </h3>
        </Link>

        <div className="mt-2 space-y-0.5">
          {hasDiscount && (
            <p className="text-xs text-text-muted line-through">
              {formatCurrency(product.originalPrice!)}
            </p>
          )}
          <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
            <span className="text-lg font-bold tabular-nums text-text-primary md:text-xl">
              {formatCurrency(product.price)}
            </span>
          </p>
          {installment && (
            <p className="text-xs text-text-secondary md:text-[13px]">
              em {installment.count}x de {formatCurrency(installment.value)} no cartão
            </p>
          )}
        </div>

        <Link
          href={productHref}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-brand bg-surface px-3 py-2.5 text-sm font-bold uppercase tracking-wide text-[#1a2744] transition-colors hover:bg-brand/5"
          aria-label={`Comprar ${product.name}`}
        >
          <IconBag className="size-5 shrink-0" />
          Comprar
        </Link>
      </div>
    </article>
  )
}
