'use client'

import { useEffect, useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { fetchApi } from '@/lib/api/fetch-api'
import { DEFAULT_SHIPPING_PROMO_TEXT } from '@/lib/layout/mappers'

export function ShippingPromoTextForm() {
  const [text, setText] = useState(DEFAULT_SHIPPING_PROMO_TEXT)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchApi<{ shipping_promo_text?: string }>('/api/admin/site-settings').then(({ data }) => {
      if (data?.shipping_promo_text != null) {
        setText(data.shipping_promo_text)
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    const { error: apiError, message } = await fetchApi('/api/admin/site-settings', {
      method: 'PATCH',
      body: JSON.stringify({ shipping_promo_text: text.trim() }),
    })

    setLoading(false)

    if (apiError) {
      setError(apiError)
      return
    }

    setSuccess(message ?? 'Texto da barra de frete atualizado')
  }

  return (
    <Card title="Barra de frete grátis">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-text-secondary">
          Texto exibido na faixa roxa no topo do site (desktop e mobile). Deixe em branco para
          ocultar a barra.
        </p>

        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <Input
          label="Texto da promoção"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
          placeholder={DEFAULT_SHIPPING_PROMO_TEXT}
        />

        <div className="rounded-md bg-brand px-4 py-2 text-center text-sm font-medium text-white">
          {text.trim() || '(barra oculta)'}
        </div>

        <Button type="submit" loading={loading}>
          Salvar texto
        </Button>
      </form>
    </Card>
  )
}
