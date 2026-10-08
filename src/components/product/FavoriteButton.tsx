'use client'

import { IconHeart } from '@/components/icons/DotIcons'
import { useFavorites } from '@/providers/FavoritesProvider'

type FavoriteButtonProps = {
  productId: string
  className?: string
  variant?: 'default' | 'card'
}

export function FavoriteButton({
  productId,
  className = '',
  variant = 'default',
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite, hydrated } = useFavorites()
  const active = hydrated && isFavorite(productId)

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void toggleFavorite(productId)
      }}
      className={
        variant === 'card'
          ? `flex h-8 items-center gap-0.5 rounded-full bg-[#f0f0f0] px-2.5 text-brand shadow-sm transition hover:bg-[#e8e8e8] ${className}`
          : `flex size-9 items-center justify-center rounded-full bg-white/90 text-brand shadow-sm transition hover:scale-105 hover:bg-white ${className}`
      }
      aria-label={active ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      aria-pressed={active}
    >
      <IconHeart className={variant === 'card' ? 'size-4' : 'size-5'} filled={active} />
      {variant === 'card' && (
        <span className="text-sm font-medium leading-none" aria-hidden>
          +
        </span>
      )}
    </button>
  )
}
