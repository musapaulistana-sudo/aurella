'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { fetchApi } from '@/lib/api/fetch-api'
import { formatCurrency } from '@/lib/products/format'
import type { InstallmentTableRow } from '@/lib/payment/installment-table'
import {
  PAYOUT_JS_URL,
  encryptCardWithPayoutSdk,
  extractPayoutErrorMessage,
} from '@/lib/payout/tokenize-card'

type PayoutPublicConfig = {
  publicKey: string | null
  apiUrl: string
}

type PayoutCardFormProps = {
  total: number
  disabled?: boolean
  onSuccess: (result: { orderId: string; paid: boolean; guestAccessToken?: string | null }) => void
  onError: (message: string) => void
  buildPayload: (cardHash: string, installments: number) => Record<string, unknown>
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function formatCardNumber(value: string): string {
  const digits = onlyDigits(value).slice(0, 16)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

function formatExpiry(value: string): string {
  const digits = onlyDigits(value).slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

export function PayoutCardForm({
  total,
  disabled,
  onSuccess,
  onError,
  buildPayload,
}: PayoutCardFormProps) {
  const [config, setConfig] = useState<PayoutPublicConfig | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)
  const [sdkReady, setSdkReady] = useState(false)
  const [installments, setInstallments] = useState<InstallmentTableRow[]>([])
  const [selectedInstallments, setSelectedInstallments] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const [number, setNumber] = useState('')
  const [holderName, setHolderName] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Payout) {
      setSdkReady(true)
    }
  }, [])

  useEffect(() => {
    async function loadConfig() {
      const { data, error } = await fetchApi<{
        publicKey: string | null
        apiUrl: string
      }>('/api/payout/config')

      if (error || !data) {
        setConfigError(error ?? 'Configuração de pagamento indisponível')
        return
      }

      setConfig({ publicKey: data.publicKey, apiUrl: data.apiUrl })
    }

    loadConfig()
  }, [])

  useEffect(() => {
    if (total <= 0) return

    async function loadInstallments() {
      const { data } = await fetchApi<{ installmentOptions: InstallmentTableRow[] }>(
        '/api/payout/config',
        {
          method: 'POST',
          body: JSON.stringify({ total }),
        }
      )
      const options = data?.installmentOptions ?? []
      setInstallments(options)
      if (options.length > 0) {
        setSelectedInstallments(options[options.length - 1]!.count)
      }
    }

    loadInstallments()
  }, [total])

  async function handleSubmit() {
    onError('')
    setSubmitting(true)

    try {
      if (!config?.publicKey) {
        throw new Error(configError ?? 'Pagamento com cartão indisponível no momento')
      }

      if (!sdkReady) {
        throw new Error('Aguarde o carregamento do pagamento seguro')
      }

      const expiryDigits = onlyDigits(expiry)
      if (expiryDigits.length !== 4) {
        throw new Error('Validade do cartão inválida')
      }

      const cardDigits = onlyDigits(number)
      if (cardDigits.length < 13) {
        throw new Error('Número do cartão inválido')
      }

      if (cvv.length < 3) {
        throw new Error('CVV inválido')
      }

      let cardHash: string
      try {
        cardHash = await encryptCardWithPayoutSdk(config.publicKey, {
          number: cardDigits,
          holderName,
          expirationMonth: expiryDigits.slice(0, 2),
          expirationYear: `20${expiryDigits.slice(2)}`,
          cvv,
        })
      } catch (e) {
        throw new Error(
          extractPayoutErrorMessage(
            e instanceof Error ? e.message : e,
            'Não foi possível validar o cartão'
          )
        )
      }

      const { data, error, message } = await fetchApi<{
        orderId: string
        paid: boolean
        guestAccessToken?: string | null
      }>('/api/checkout/card', {
        method: 'POST',
        body: JSON.stringify(buildPayload(cardHash, selectedInstallments)),
      })

      if (error || !data?.orderId) {
        throw new Error(error ?? message ?? 'Pagamento recusado')
      }

      onSuccess({
        orderId: data.orderId,
        paid: data.paid,
        guestAccessToken: data.guestAccessToken,
      })
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Não foi possível processar o cartão')
    } finally {
      setSubmitting(false)
    }
  }

  if (configError) {
    return <Alert type="error">{configError}</Alert>
  }

  return (
    <div className="space-y-4">
      <Script
        src={PAYOUT_JS_URL}
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
        onError={() =>
          onError('Não foi possível carregar a biblioteca de pagamento. Recarregue a página.')
        }
      />

      <Input
        label="Número do cartão"
        value={number}
        onChange={(e) => setNumber(formatCardNumber(e.target.value))}
        placeholder="0000 0000 0000 0000"
        autoComplete="cc-number"
        inputMode="numeric"
        required
      />
      <Input
        label="Nome impresso no cartão"
        value={holderName}
        onChange={(e) => setHolderName(e.target.value)}
        placeholder="Nome e sobrenome"
        autoComplete="cc-name"
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Validade"
          value={expiry}
          onChange={(e) => setExpiry(formatExpiry(e.target.value))}
          placeholder="MM/AA"
          autoComplete="cc-exp"
          inputMode="numeric"
          required
        />
        <Input
          label="CVV"
          value={cvv}
          onChange={(e) => setCvv(onlyDigits(e.target.value).slice(0, 4))}
          placeholder="123"
          autoComplete="cc-csc"
          inputMode="numeric"
          required
        />
      </div>

      {installments.length > 0 && (
        <div className="space-y-2">
          <label htmlFor="checkout-installments" className="block text-sm font-medium text-text-primary">
            Parcelas
          </label>
          <select
            id="checkout-installments"
            value={selectedInstallments}
            onChange={(e) => setSelectedInstallments(Number(e.target.value))}
            className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            {installments.map((row) => (
              <option key={row.count} value={row.count}>
                {row.label} — total {formatCurrency(row.total)}
              </option>
            ))}
          </select>
        </div>
      )}

      <Button
        type="button"
        className="w-full rounded-md uppercase tracking-wide"
        loading={submitting}
        disabled={disabled || submitting || !config?.publicKey || !sdkReady}
        onClick={handleSubmit}
      >
        {sdkReady ? `Pagar ${formatCurrency(total)}` : 'A carregar pagamento…'}
      </Button>
    </div>
  )
}
