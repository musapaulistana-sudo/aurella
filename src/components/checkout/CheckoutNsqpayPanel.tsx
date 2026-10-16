'use client'

import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/products/format'
import { formatMultibancoReference } from '@/lib/vorkpay/format'

type MbwayProps = {
  method: 'mbway'
  orderId: string
  total: number
  message?: string
  polling: boolean
  onRefresh: () => void
}

type MultibancoProps = {
  method: 'multibanco'
  orderId: string
  total: number
  entity: string
  reference: string
  amount: number
  expiresAt: string | null
  polling: boolean
  onRefresh: () => void
}

type CheckoutNsqpayPanelProps = MbwayProps | MultibancoProps

function formatExpiresAt(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('pt-PT')
}

export function CheckoutNsqpayPanel(props: CheckoutNsqpayPanelProps) {
  if (props.method === 'mbway') {
    return (
      <div className="space-y-4 rounded-lg border border-border bg-surface-muted p-4">
        <div>
          <p className="text-sm font-semibold text-text-primary">MB WAY</p>
          <p className="mt-1 text-sm text-text-secondary">
            {props.message ??
              'Abra a app MB WAY no telemóvel e confirme o pagamento. Tem até 4 minutos.'}
          </p>
        </div>
        <p className="text-lg font-bold tabular-nums text-text-primary">
          {formatCurrency(props.total)}
        </p>
        <p className="text-xs text-text-muted">
          Encomenda {props.orderId.slice(0, 8)}… ·{' '}
          {props.polling ? 'A aguardar confirmação…' : 'Pode atualizar o estado'}
        </p>
        <Button type="button" variant="secondary" onClick={props.onRefresh}>
          Atualizar estado
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface-muted p-4">
      <div>
        <p className="text-sm font-semibold text-text-primary">Pagamento Multibanco</p>
        <p className="mt-1 text-sm text-text-secondary">
          Pague em qualquer ATM ou homebanking. A referência é válida por 3 dias.
        </p>
      </div>

      <dl className="space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">Entidade</dt>
          <dd className="font-semibold tabular-nums text-text-primary">{props.entity}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">Referência</dt>
          <dd className="font-semibold tabular-nums text-text-primary">
            {formatMultibancoReference(props.reference)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">Valor</dt>
          <dd className="font-bold tabular-nums text-text-primary">
            {formatCurrency(props.amount || props.total)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">Válido até</dt>
          <dd className="text-text-primary">{formatExpiresAt(props.expiresAt)}</dd>
        </div>
      </dl>

      <p className="text-xs text-text-muted">
        Encomenda {props.orderId.slice(0, 8)}… ·{' '}
        {props.polling ? 'A aguardar confirmação…' : 'Pode atualizar o estado'}
      </p>
      <Button type="button" variant="secondary" onClick={props.onRefresh}>
        Atualizar estado
      </Button>
    </div>
  )
}
