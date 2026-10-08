'use client'

import { useCallback, useEffect, useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/products/format'
import { formatCep, isValidPostalCode, readStoredCep, writeStoredCep } from '@/lib/shipping/cep-storage'
import type { ShippingQuoteLine, ShippingQuoteResult } from '@/types/shipping'

type ShippingCalculatorProps = {
  subtotal: number
  compact?: boolean
  variant?: 'default' | 'product'
  onSelect?: (option: ShippingQuoteLine | null) => void
}

const CEP_LOOKUP_URL =
  'https://www.ctt.pt/feapl_2/app/open/tools.jspx?tool=1'

export function ShippingCalculator({
  subtotal,
  compact = false,
  variant = 'default',
  onSelect,
}: ShippingCalculatorProps) {
  const [cep, setCep] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quote, setQuote] = useState<ShippingQuoteResult | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingCep, setEditingCep] = useState(false)

  useEffect(() => {
    const stored = readStoredCep()
    setCep(stored)
    if (!stored) setEditingCep(true)
  }, [])

  const calculate = useCallback(async (cepOverride?: string) => {
    setError(null)
    const digits = (cepOverride ?? cep).replace(/\D/g, '')
    if (!isValidPostalCode(digits)) {
      setError('Indique um código postal válido (7 dígitos)')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/shipping/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cep: digits, subtotal }),
      })
      const json = await res.json()

      if (json.error || !json.data) {
        setError(json.message ?? 'Não foi possível calcular os portes')
        setQuote(null)
        onSelect?.(null)
        return
      }

      const result = json.data as ShippingQuoteResult
      setQuote(result)
      writeStoredCep(digits)
      setEditingCep(false)

      if (result.options.length === 0) {
        setError('Nenhuma forma de envio disponível para este código postal')
        onSelect?.(null)
        return
      }

      const first = result.options[0]
      setSelectedId(first.methodId)
      onSelect?.(first)
    } catch {
      setError('Não foi possível calcular os portes')
      onSelect?.(null)
    } finally {
      setLoading(false)
    }
  }, [cep, subtotal, onSelect])

  useEffect(() => {
    if (variant !== 'product') return
    const stored = readStoredCep()
    if (!isValidPostalCode(stored)) return
    void calculate(stored)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- quote once from saved postal code on mount
  }, [variant, subtotal])

  function handleSelect(option: ShippingQuoteLine) {
    setSelectedId(option.methodId)
    onSelect?.(option)
  }

  const isProduct = variant === 'product'
  const formattedCep = cep ? formatCep(cep) : ''

  if (isProduct) {
    return (
      <div className="space-y-3 border-t border-border pt-5">
        <div>
          <p className="text-sm text-text-primary">
            Entrega para o{' '}
            <strong>
              código postal:{' '}
              {formattedCep || '————-——'}
            </strong>
          </p>
          <p className="mt-1 text-xs text-text-muted">
            O prazo de entrega começa a contar após a confirmação do pagamento.
          </p>
        </div>

        {(editingCep || !formattedCep) && (
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={cep}
                onChange={(e) => setCep(formatCep(e.target.value))}
                placeholder="0000-000"
                inputMode="numeric"
                aria-label="Código postal para cálculo de portes"
                className="w-full rounded-md border border-border bg-surface py-3 pl-4 pr-28 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
              <button
                type="button"
                onClick={() => void calculate()}
                disabled={loading}
                className="absolute bottom-1 right-1 top-1 rounded-sm bg-brand px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loading ? '...' : 'Calcular'}
              </button>
            </div>
            <a
              href={CEP_LOOKUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm text-brand underline underline-offset-2"
            >
              Não sei o meu código postal
            </a>
          </div>
        )}

        {error && <Alert type="error">{error}</Alert>}

        {quote && quote.options.length > 0 && (
          <ul className="space-y-2" role="list">
            {quote.options.map((option) => {
              const selected = selectedId === option.methodId
              return (
                <li key={option.methodId}>
                  <button
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`w-full rounded-md px-4 py-3 text-left transition-colors ${
                      selected
                        ? 'bg-surface-muted ring-1 ring-brand/30'
                        : 'bg-surface-muted hover:ring-1 hover:ring-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-brand">{option.name}</p>
                        <p className="mt-1 text-sm text-text-primary">
                          Chega em até{' '}
                          <strong>
                            {option.deliveryLabel.replace(/^em\s+/i, '') || option.deliveryLabel}
                          </strong>{' '}
                          na sua morada.
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-brand tabular-nums">
                        {option.isFree ? 'Grátis' : formatCurrency(option.price)}
                      </p>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {formattedCep && !editingCep && (
          <button
            type="button"
            onClick={() => setEditingCep(true)}
            className="text-sm font-medium text-brand underline underline-offset-2"
          >
            Alterar código postal
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div>
        <p className="text-sm font-semibold text-text-primary">Calcular portes</p>
        {!compact && (
          <p className="mt-1 text-xs text-text-muted">
            Indique o código postal para ver prazos e valores de entrega.
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          label="Código postal"
          value={cep}
          onChange={(e) => setCep(formatCep(e.target.value))}
          placeholder="0000-000"
          inputMode="numeric"
          className="flex-1"
          aria-label="Código postal para cálculo de portes"
        />
        <div className="flex items-end">
          <Button type="button" variant="secondary" loading={loading} onClick={() => void calculate()}>
            Calcular
          </Button>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {quote && quote.options.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-md bg-surface-muted" role="list">
          {quote.options.map((option) => {
            const selected = selectedId === option.methodId
            return (
              <li key={option.methodId}>
                <button
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`w-full px-3 py-3 text-left transition-colors ${
                    selected ? 'bg-brand/5' : 'bg-surface-muted hover:bg-surface'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{option.name}</p>
                      {option.description && (
                        <p className="mt-0.5 text-xs text-text-secondary">{option.description}</p>
                      )}
                      <p className="mt-1 text-xs text-text-muted">{option.deliveryLabel}</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-brand tabular-nums">
                      {option.isFree ? 'Grátis' : formatCurrency(option.price)}
                    </p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export type { ShippingQuoteLine }
