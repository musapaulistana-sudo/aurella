'use client'

import { useState } from 'react'
import { useCart } from '@/providers/CartProvider'

type ProductPurchaseBarProps = {
  productId: string
  stock: number
}

export function ProductPurchaseBar({ productId, stock }: ProductPurchaseBarProps) {
  const { addItem, openCartDrawer } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  const inStock = stock > 0
  const maxQty = Math.min(99, stock)

  function handleBuy() {
    if (!inStock) return
    addItem(productId, quantity)
    setAdded(true)
    openCartDrawer()
    window.setTimeout(() => setAdded(false), 2500)
  }

  if (!inStock) {
    return (
      <button
        type="button"
        disabled
        className="w-full rounded bg-text-muted px-4 py-3.5 text-center text-base font-bold uppercase tracking-wide text-white opacity-80"
      >
        Indisponível
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex shrink-0 items-center rounded border border-border">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="flex size-10 items-center justify-center text-lg text-text-primary transition-colors hover:bg-surface-muted disabled:opacity-40"
            aria-label="Diminuir quantidade"
          >
            −
          </button>
          <label className="sr-only" htmlFor="product-qty">
            Quantidade
          </label>
          <input
            id="product-qty"
            type="number"
            min={1}
            max={maxQty}
            value={quantity}
            onChange={(e) => {
              const next = parseInt(e.target.value, 10)
              if (!Number.isNaN(next)) {
                setQuantity(Math.min(maxQty, Math.max(1, next)))
              }
            }}
            className="w-10 border-x border-border bg-transparent py-2 text-center text-sm font-semibold text-text-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            disabled={quantity >= maxQty}
            className="flex size-10 items-center justify-center text-lg text-text-primary transition-colors hover:bg-surface-muted disabled:opacity-40"
            aria-label="Aumentar quantidade"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={handleBuy}
          className="flex-1 rounded bg-brand px-4 py-3.5 text-base font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
        >
          {added ? 'Adicionado!' : 'Comprar'}
        </button>
      </div>
    </div>
  )
}
