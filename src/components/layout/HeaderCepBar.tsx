'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { IconChevronRight, IconMapPin } from '@/components/icons/DotIcons'
import {
  formatCep,
  readStoredCep,
  writeStoredCep,
} from '@/lib/shipping/cep-storage'

type HeaderCepBarProps = {
  variant: 'mobile' | 'desktop'
  className?: string
}

export function HeaderCepBar({ variant, className = '' }: HeaderCepBarProps) {
  const inputId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const [cep, setCep] = useState(() => readStoredCep())
  const [draft, setDraft] = useState(() => formatCep(readStoredCep()))
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setDraft(formatCep(cep))
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, cep])

  function saveCep() {
    const digits = draft.replace(/\D/g, '').slice(0, 7)
    if (digits.length !== 7) return
    writeStoredCep(digits)
    setCep(digits)
    setDraft(formatCep(digits))
    setOpen(false)
  }

  const formatted = cep ? formatCep(cep) : null
  const label = formatted ? `Enviar para: ${formatted}` : 'Indique o código postal de entrega'

  return (
    <div ref={panelRef} className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-2 text-left text-sm text-text-primary transition-colors hover:text-brand ${
          variant === 'mobile' ? 'justify-between px-0 py-2.5' : 'py-3 pr-4'
        }`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="flex min-w-0 items-center gap-2">
          <IconMapPin className="size-4 shrink-0 text-brand" />
          <span className="truncate font-normal">{label}</span>
        </span>
        {variant === 'mobile' && (
          <IconChevronRight className="size-4 shrink-0 text-brand" />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-labelledby={`${inputId}-label`}
          className={`absolute z-[80] rounded-lg border border-border bg-surface p-3 shadow-lg ${
            variant === 'mobile'
              ? 'left-0 right-0 top-full mt-1'
              : 'left-0 top-full mt-1 w-72'
          }`}
        >
          <label
            id={`${inputId}-label`}
            htmlFor={inputId}
            className="mb-2 block text-xs font-medium text-text-secondary"
          >
            Código postal de entrega
          </label>
          <div className="flex gap-2">
            <input
              id={inputId}
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              value={draft}
              onChange={(e) => setDraft(formatCep(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveCep()
              }}
              placeholder="0000-000"
              className="min-w-0 flex-1 rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
            />
            <button
              type="button"
              onClick={saveCep}
              className="shrink-0 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
