'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { FavoriteButton } from '@/components/product/FavoriteButton'

const THUMB_SIZE = 64
const THUMB_GAP = 8
const VISIBLE_THUMBS = 5

type ProductGalleryProps = {
  images: { id: string; url: string; alt: string }[]
  productName: string
  discountPercent: number | null
  productId: string
}

export function ProductGallery({
  images,
  productName,
  discountPercent,
  productId,
}: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const thumbListRef = useRef<HTMLDivElement>(null)
  const active = images[activeIndex]
  const thumbViewportHeight = VISIBLE_THUMBS * THUMB_SIZE + (VISIBLE_THUMBS - 1) * THUMB_GAP

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg bg-surface-muted text-sm text-text-muted">
        Sem imagem
      </div>
    )
  }

  function scrollThumbs() {
    const el = thumbListRef.current
    if (!el) return
    el.scrollBy({ top: THUMB_SIZE + THUMB_GAP, behavior: 'smooth' })
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
      {images.length > 1 && (
        <div className="order-2 flex items-center gap-2 sm:order-1 sm:w-16 sm:shrink-0 sm:flex-col">
          <div
            ref={thumbListRef}
            className="flex gap-2 overflow-x-auto sm:max-h-none sm:flex-col sm:overflow-y-auto sm:[-ms-overflow-style:none] sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden"
            style={{ maxHeight: thumbViewportHeight }}
          >
            {images.map((img, index) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`relative size-16 shrink-0 overflow-hidden rounded-md border-2 bg-white transition-colors ${
                  index === activeIndex
                    ? 'border-brand'
                    : 'border-transparent hover:border-brand/40'
                }`}
                aria-label={`Ver imagem ${index + 1}`}
                aria-current={index === activeIndex}
              >
                <Image src={img.url} alt="" fill sizes="64px" className="object-contain p-1" />
              </button>
            ))}
          </div>

          {images.length > VISIBLE_THUMBS && (
            <button
              type="button"
              onClick={scrollThumbs}
              className="hidden size-8 items-center justify-center text-text-muted transition-colors hover:text-brand sm:flex"
              aria-label="Ver mais miniaturas"
            >
              <ChevronDown className="size-5" aria-hidden />
            </button>
          )}

          <FavoriteButton
            productId={productId}
            variant="card"
            className="mt-1 hidden self-start sm:flex"
          />
        </div>
      )}

      <div className="relative order-1 min-w-0 flex-1 sm:order-2">
        <div className="relative aspect-square overflow-hidden bg-white">
          {discountPercent != null && (
            <span className="absolute right-3 top-3 z-10 flex size-14 flex-col items-center justify-center rounded-full bg-[#1a2744] text-center leading-none text-white shadow-sm md:size-16">
              <span className="text-sm font-bold md:text-base">{discountPercent}%</span>
              <span className="text-[9px] font-bold uppercase tracking-wide md:text-[10px]">
                Off
              </span>
            </span>
          )}

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setActiveIndex((i) => (i === 0 ? images.length - 1 : i - 1))
                }
                className="absolute left-0 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center text-text-muted transition-colors hover:text-text-primary md:left-1"
                aria-label="Imagem anterior"
              >
                <ChevronLeft className="size-8 stroke-[1.25]" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setActiveIndex((i) => (i === images.length - 1 ? 0 : i + 1))
                }
                className="absolute right-0 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center text-text-muted transition-colors hover:text-text-primary md:right-1"
                aria-label="Próxima imagem"
              >
                <ChevronRight className="size-8 stroke-[1.25]" />
              </button>
            </>
          )}

          <Image
            src={active.url}
            alt={active.alt || productName}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain p-4 md:p-8"
          />
        </div>

        <FavoriteButton
          productId={productId}
          variant="card"
          className={`absolute bottom-3 left-3 z-10 ${images.length > 1 ? 'sm:hidden' : ''}`}
        />
      </div>
    </div>
  )
}
