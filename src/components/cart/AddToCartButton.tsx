'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useCart } from '@/providers/CartProvider'

type AddToCartButtonProps = {
  productId: string
  stock: number
  className?: string
}

export function AddToCartButton({ productId, stock, className = '' }: AddToCartButtonProps) {
  const { addItem, openCartDrawer } = useCart()
  const [added, setAdded] = useState(false)

  const inStock = stock > 0

  function handleAdd() {
    if (!inStock) return
    addItem(productId, 1)
    setAdded(true)
    openCartDrawer()
    window.setTimeout(() => setAdded(false), 2000)
  }

  if (!inStock) {
    return (
      <button
        type="button"
        disabled
        className={`w-full rounded-md bg-text-muted px-4 py-3.5 text-center text-white opacity-80 ${className}`}
      >
        <span className="block text-lg font-bold">Indisponível</span>
      </button>
    )
  }

  return (
    <Button
      type="button"
      onClick={handleAdd}
      className={`w-full rounded-md py-3.5 text-lg ${className}`}
    >
      {added ? 'Adicionado!' : 'Adicionar ao carrinho'}
    </Button>
  )
}
