'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { fetchApi } from '@/lib/api/fetch-api'

export type TrackingEvent = {
  date: string
  location: string
  status: string
  description: string
}

export type TrackingResult = {
  transaction_id: string | null
  tracking_code: string | null
  status: string | null
  current_status: string | null
  events: TrackingEvent[]
  has_events: boolean
}

type TrackingPanelProps = {
  /** Prefixo da rota ao atualizar a query (ex.: /rastreio ou /conta/rastreio) */
  basePath: string
  title?: string
  subtitle?: string
  initialCode?: string | null
  autoSearch?: boolean
}

export function TrackingPanel({
  basePath,
  title = 'Rastrear encomenda',
  subtitle = 'Indique o código de rastreio para acompanhar a entrega na loja.',
  initialCode = null,
  autoSearch = true,
}: TrackingPanelProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const codeFromUrl =
    searchParams.get('codigo')?.trim() ||
    searchParams.get('code')?.trim() ||
    searchParams.get('pedido')?.trim() ||
    initialCode?.trim() ||
    ''

  const [code, setCode] = useState(codeFromUrl)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TrackingResult | null>(null)

  const search = useCallback(
    async (raw: string, updateUrl = true) => {
      const value = raw.trim()
      if (!value) {
        setError('Informe um código de rastreio válido')
        setResult(null)
        return
      }

      setLoading(true)
      setError(null)

      const looksLikeUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          value
        )
      const query = looksLikeUuid
        ? `pedido=${encodeURIComponent(value)}`
        : `codigo=${encodeURIComponent(value)}`

      const { data, error: apiError } = await fetchApi<TrackingResult>(`/api/tracking?${query}`)
      setLoading(false)

      if (apiError || !data) {
        setResult(null)
        setError(apiError ?? 'Não foi possível consultar o rastreio')
        return
      }

      setResult(data)

      if (updateUrl) {
        const displayCode = data.tracking_code || value
        const next = `${basePath}?codigo=${encodeURIComponent(displayCode)}`
        router.replace(next, { scroll: false })
      }
    },
    [basePath, router]
  )

  useEffect(() => {
    setCode(codeFromUrl)
  }, [codeFromUrl])

  useEffect(() => {
    if (!autoSearch || !codeFromUrl) return
    void search(codeFromUrl, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when URL code changes
  }, [codeFromUrl, autoSearch])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    void search(code)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary md:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-text-secondary">{subtitle}</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Input
              label="Código de rastreio ou ID da encomenda"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex.: código CTT ou ID da encomenda"
              autoComplete="off"
              required
            />
          </div>
          <Button type="submit" loading={loading} className="w-full sm:w-auto">
            Buscar
          </Button>
        </form>
      </Card>

      {error && <Alert type="error">{error}</Alert>}

      {loading && !result && (
        <p className="text-sm text-text-secondary">Consultando rastreio…</p>
      )}

      {result && (
        <Card className="!p-0 overflow-hidden">
          <div className="border-b border-border bg-brand/5 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-brand">
              Estado atual
            </p>
            <p className="mt-1 text-lg font-semibold text-text-primary">
              {result.current_status || result.status || 'Aguardando atualização'}
            </p>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {result.tracking_code && (
                <div>
                  <dt className="text-text-muted">Código de rastreio</dt>
                  <dd className="font-mono font-medium text-text-primary">
                    {result.tracking_code}
                  </dd>
                </div>
              )}
              {result.transaction_id && (
                <div>
                  <dt className="text-text-muted">Encomenda</dt>
                  <dd className="font-mono font-medium text-text-primary">
                    #{result.transaction_id.slice(0, 8).toUpperCase()}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="px-5 py-5">
            <h2 className="text-sm font-semibold text-text-primary">Histórico</h2>
            {!result.has_events ? (
              <p className="mt-3 text-sm text-text-secondary">
                Ainda não há movimentações registadas para este envio. O estado atual está
                acima — volte em breve para novas atualizações.
              </p>
            ) : (
              <ol className="relative mt-4 space-y-0 border-l border-border pl-5">
                {result.events.map((event, index) => {
                  const isLatest = index === 0
                  return (
                    <li key={`${event.date}-${event.status}-${index}`} className="relative pb-6 last:pb-0">
                      <span
                        className={`absolute -left-[1.4rem] top-1.5 size-2.5 rounded-full ring-4 ring-surface ${
                          isLatest ? 'bg-brand' : 'bg-text-muted'
                        }`}
                        aria-hidden
                      />
                      <div className={isLatest ? '' : 'opacity-90'}>
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <p
                            className={`font-medium ${
                              isLatest ? 'text-brand' : 'text-text-primary'
                            }`}
                          >
                            {event.status || 'Atualização'}
                          </p>
                          {event.date && (
                            <time className="text-xs text-text-muted">{event.date}</time>
                          )}
                        </div>
                        {event.location && (
                          <p className="mt-0.5 text-xs text-text-secondary">{event.location}</p>
                        )}
                        {event.description && event.description !== event.status && (
                          <p className="mt-1 text-sm text-text-secondary">{event.description}</p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </Card>
      )}

      <p className="text-xs text-text-muted">
        Precisa de ajuda?{' '}
        <Link href="/fale-conosco" className="text-brand hover:underline">
          Contacte-nos
        </Link>
        {basePath.startsWith('/conta') ? null : (
          <>
            {' '}
            ou aceda a{' '}
            <Link href="/conta/rastreio" className="text-brand hover:underline">
              A minha conta → Rastrear encomenda
            </Link>
          </>
        )}
        .
      </p>
    </div>
  )
}
