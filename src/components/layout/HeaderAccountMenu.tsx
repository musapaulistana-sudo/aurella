'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { IconChevronDown, IconCustomer } from '@/components/icons/DotIcons'

type HeaderAccountMenuProps = {
  helpHref?: string
}

export function HeaderAccountMenu({ helpHref = '/fale-conosco' }: HeaderAccountMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative hidden lg:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-left text-text-primary transition-colors hover:text-brand"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <IconCustomer className="size-7 shrink-0" />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-[15px] font-medium">Olá!</span>
          <span className="text-[12px] text-text-secondary">Inicie sessão na sua conta</span>
        </span>
        <IconChevronDown className="size-3.5 shrink-0 self-end text-text-muted" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] z-[80] w-56 rounded-md border border-border bg-surface p-3 shadow-lg"
        >
          <Link
            href="/conta/login"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-center rounded-md bg-text-primary px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
          >
            Entrar
          </Link>
          <ul className="mt-3 space-y-1">
            <li>
              <Link
                href="/conta"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block rounded px-1 py-1.5 text-sm text-text-primary transition-colors hover:text-brand"
              >
                Minha Conta
              </Link>
            </li>
            <li>
              <Link
                href="/conta/pedidos"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block rounded px-1 py-1.5 text-sm text-text-primary transition-colors hover:text-brand"
              >
                As minhas encomendas
              </Link>
            </li>
            <li>
              <Link
                href={helpHref}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block rounded px-1 py-1.5 text-sm text-text-primary transition-colors hover:text-brand"
              >
                Atendimento
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
