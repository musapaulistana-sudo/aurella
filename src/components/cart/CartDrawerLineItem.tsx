'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { QuantityControl } from '@/components/cart/QuantityControl'
import { IconTrash } from '@/components/icons/DotIcons'
import { formatCurrency } from '@/lib/products/format'
import { useCart } from '@/providers/CartProvider'
import type { ValidatedCartLine } from '@/types/cart'

type CartDrawerLineItemProps = {
  line: ValidatedCartLine
  updating?: boolean
  onNavigate?: () => void
}

export function CartDrawerLineItem({
  line,
  updating = false,
  onNavigate,
}: CartDrawerLineItemProps) {
  const { setQuantity, removeItem } = useCart()
  const [removing, setRemoving] = useState(false)

  function handleRemove() {
    setRemoving(true)
    removeItem(line.productId)
  }

  return (
    <li
      className={`flex gap-3 border-b border-border py-4 transition-opacity last:border-b-0 ${
        updating || removing ? 'opacity-60' : ''
      }`}
    >
      <Link
        href={`/produto/${line.slug}`}
        onClick={onNavigate}
        className="relative size-16 shrink-0 overflow-hidden rounded-md border border-border bg-surface-muted"
      >
        {line.imageUrl ? (
          <Image
            src={line.imageUrl}
            alt={line.imageAlt}
            fill
            sizes="64px"
            className="object-contain p-1.5"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-[10px] text-text-muted">
            Sem imagem
          </span>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/produto/${line.slug}`}
            onClick={onNavigate}
            className="line-clamp-2 text-sm text-text-primary hover:text-brand"
          >
            {line.name}
          </Link>
          <p className="shrink-0 text-sm font-bold tabular-nums text-badge-discount">
            {formatCurrency(line.price)}
          </p>
        </div>

        {!line.available && (
          <p className="mt-1 text-xs font-medium text-badge-discount">Indisponível</p>
        )}
        {line.quantityAdjusted && line.available && (
          <p className="mt-1 text-xs text-text-secondary">
            Ajustado ao estoque ({line.stock})
          </p>
        )}

        <div className="mt-2.5 flex items-center justify-between gap-2">
          {line.available ? (
            <QuantityControl
              value={line.quantity}
              max={Math.min(99, line.stock)}
              onChange={(qty) => setQuantity(line.productId, qty)}
              disabled={updating}
              label={line.name}
            />
          ) : (
            <button
              type="button"
              onClick={handleRemove}
              className="text-xs font-medium text-badge-discount hover:underline"
            >
              Remover
            </button>
          )}

          {line.available && (
            <button
              type="button"
              onClick={handleRemove}
              className="flex size-9 items-center justify-center text-text-secondary transition-colors hover:text-badge-discount"
              aria-label={`Remover ${line.name} do carrinho`}
            >
              <IconTrash className="size-4" />
            </button>
          )}
        </div>
      </div>
    </li>
  )
}
