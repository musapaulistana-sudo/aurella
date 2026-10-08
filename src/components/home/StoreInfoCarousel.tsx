'use client'

import { useCallback, useEffect, useState } from 'react'
import { CreditCard, Headphones, ShieldCheck, Truck } from 'lucide-react'

type StoreInfoIcon = 'truck' | 'headphones' | 'credit-card' | 'shield'

export type StoreInfoItem = {
  id: string
  title: string
  text: string
  icon: StoreInfoIcon
}

type StoreInfoCarouselProps = {
  items: StoreInfoItem[]
}

const ICONS = {
  truck: Truck,
  headphones: Headphones,
  'credit-card': CreditCard,
  shield: ShieldCheck,
} as const

export function StoreInfoCarousel({ items }: StoreInfoCarouselProps) {
  const [index, setIndex] = useState(0)
  const count = items.length

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return
      setIndex(((next % count) + count) % count)
    },
    [count]
  )

  useEffect(() => {
    if (count <= 1) return
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [count])

  if (count === 0) return null

  function renderItem(
    item: StoreInfoItem,
    itemIndex: number,
    className: string,
    hideInactive = false
  ) {
    const Icon = ICONS[item.icon]

    return (
      <div
        key={item.id}
        className={className}
        aria-hidden={hideInactive ? itemIndex !== index : undefined}
      >
        <Icon className="size-5 shrink-0 text-brand" aria-hidden />
        <div className="min-w-0 text-left">
          <p className="truncate text-xs font-semibold text-text-primary sm:text-sm">
            {item.title}
          </p>
          <p className="truncate text-[11px] text-text-muted sm:text-xs">{item.text}</p>
        </div>
      </div>
    )
  }

  return (
    <section
      className="border-y border-border/70 bg-surface"
      aria-label="Informações da loja"
      aria-roledescription="carrossel"
    >
      <div className="mx-auto max-w-7xl px-4 py-3 md:px-6 md:py-4">
        <div className="hidden md:grid md:grid-cols-4 md:divide-x md:divide-border/70">
          {items.map((item, itemIndex) =>
            renderItem(
              item,
              itemIndex,
              'flex min-w-0 items-center justify-center gap-2 px-4 first:pl-0 last:pr-0'
            )
          )}
        </div>

        <div className="flex items-center md:hidden">
          {count > 1 && (
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              className="mr-2 flex size-7 shrink-0 items-center justify-center text-lg text-text-muted transition-colors hover:text-brand"
              aria-label="Informação anterior"
            >
              ‹
            </button>
          )}

          <div className="min-w-0 flex-1 overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {items.map((item, itemIndex) =>
              renderItem(
                item,
                itemIndex,
                'flex w-full shrink-0 items-center justify-center gap-2',
                true
              )
            )}
          </div>
          </div>

          {count > 1 && (
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              className="ml-2 flex size-7 shrink-0 items-center justify-center text-lg text-text-muted transition-colors hover:text-brand"
              aria-label="Próxima informação"
            >
              ›
            </button>
          )}
        </div>

        {count > 1 && (
          <div className="mt-2 flex justify-center gap-1.5 md:hidden" aria-label="Selecionar informação">
            {items.map((item, itemIndex) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(itemIndex)}
                className={`h-1 rounded-full transition-all ${
                  itemIndex === index ? 'w-5 bg-brand' : 'w-1 bg-border hover:bg-text-muted'
                }`}
                aria-label={`Ir para informação ${itemIndex + 1}`}
                aria-current={itemIndex === index}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
