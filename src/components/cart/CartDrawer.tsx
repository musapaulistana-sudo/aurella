'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { CartDrawerLineItem } from '@/components/cart/CartDrawerLineItem'
import { IconCart } from '@/components/icons/DotIcons'
import { useCartSync } from '@/hooks/useCartSync'
import { formatCurrency } from '@/lib/products/format'
import { useCart } from '@/providers/CartProvider'

const EXIT_MS = 300

function DrawerSkeleton() {
  return (
    <div className="space-y-4 px-1" aria-busy="true" aria-label="A carregar carrinho">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3 border-b border-border py-4">
          <div className="size-16 animate-pulse rounded-md bg-surface-muted" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-surface-muted" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-surface-muted" />
            <div className="h-9 w-28 animate-pulse rounded bg-surface-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CartDrawer() {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  const { items, itemCount, isDrawerOpen, closeCartDrawer } = useCart()
  const { data, loading, error } = useCartSync({
    enabled: isDrawerOpen && items.length > 0,
  })
  const [portalReady, setPortalReady] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (pathnameRef.current === pathname) return
    pathnameRef.current = pathname
    closeCartDrawer()
  }, [pathname, closeCartDrawer])

  useEffect(() => {
    if (isDrawerOpen) {
      setMounted(true)
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }

    setVisible(false)
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [isDrawerOpen])

  useEffect(() => {
    if (!mounted) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    if (visible) {
      closeRef.current?.focus()
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeCartDrawer()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [mounted, visible, closeCartDrawer])

  if (!portalReady || !mounted || typeof document === 'undefined') return null

  const showLines = data && data.lines.length > 0
  const isEmpty = items.length === 0
  const availableLines = data?.lines.filter((line) => line.available && line.quantity > 0) ?? []
  const canCheckout = availableLines.length > 0 && !loading

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="presentation">
      <button
        type="button"
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ease-out ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={closeCartDrawer}
        aria-label="Fechar carrinho"
        tabIndex={-1}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`absolute inset-y-0 right-0 flex w-full max-w-[400px] flex-col bg-surface shadow-2xl transition-transform duration-300 ease-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <div className="flex items-center gap-2">
            <IconCart className="size-5 text-badge-discount" />
            <h2 id={titleId} className="text-base font-semibold text-text-primary">
              O seu carrinho ({itemCount})
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={closeCartDrawer}
            className="flex size-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary"
            aria-label="Fechar carrinho"
          >
            <span className="text-2xl leading-none" aria-hidden>
              ×
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          {error && !isEmpty && (
            <p className="py-4 text-sm text-badge-discount" role="alert">
              {error}
            </p>
          )}

          {isEmpty ? (
            <div className="flex flex-col items-center px-2 py-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-surface-muted text-brand">
                <IconCart className="size-7" />
              </div>
              <p className="mt-4 text-sm font-semibold text-text-primary">
                O carrinho está vazio
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                Adicione produtos para continuar.
              </p>
              <button
                type="button"
                onClick={closeCartDrawer}
                className="mt-6 rounded-md bg-logo px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Continuar comprando
              </button>
            </div>
          ) : loading && !data ? (
            <DrawerSkeleton />
          ) : showLines ? (
            <ul role="list">
              {data.lines.map((line) => (
                <CartDrawerLineItem
                  key={line.productId}
                  line={line}
                  updating={loading}
                  onNavigate={closeCartDrawer}
                />
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-text-secondary">
              Nenhum item disponível no carrinho.
            </p>
          )}
        </div>

        {!isEmpty && (
          <div className="border-t border-border bg-surface px-4 py-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="text-sm text-text-primary">Subtotal</span>
              <span className="text-base font-bold tabular-nums text-badge-discount">
                {loading && !data ? '…' : formatCurrency(data?.subtotal ?? 0)}
              </span>
            </div>

            <div className="space-y-2.5">
              <Link
                href="/checkout"
                onClick={closeCartDrawer}
                className={`block rounded-md bg-success px-4 py-3.5 text-center text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90 ${
                  !canCheckout ? 'pointer-events-none opacity-60' : ''
                }`}
                aria-disabled={!canCheckout}
              >
                Finalizar compra
              </Link>
              <Link
                href="/carrinho"
                onClick={closeCartDrawer}
                className="block rounded-md border border-border bg-surface px-4 py-3 text-center text-sm font-semibold text-text-primary transition-colors hover:bg-surface-muted"
              >
                Ver carrinho completo
              </Link>
            </div>
          </div>
        )}
      </aside>
    </div>,
    document.body
  )
}
