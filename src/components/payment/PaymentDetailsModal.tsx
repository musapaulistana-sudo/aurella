'use client'

import { useState } from 'react'
import { CreditCard } from 'lucide-react'
import { PaymentIconsRow } from '@/components/payment/PaymentIconsRow'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/lib/products/format'
import { calcInstallmentDisplay } from '@/lib/payment/installments'
import { buildInstallmentTable } from '@/lib/payment/installment-table'
import type { PaymentMethodIcon, PaymentSettings } from '@/types/payment'

type PaymentDetailsTriggerProps = {
  price: number
  paymentSettings: PaymentSettings
  paymentIcons: PaymentMethodIcon[]
  layout?: 'default' | 'product'
}

function formatProductInstallmentLine(
  display: NonNullable<ReturnType<typeof calcInstallmentDisplay>>
) {
  const suffix = display.interestFree ? 'sem juros' : 'com juros'
  return (
    <>
      ou <span className="font-bold text-text-primary">{formatCurrency(display.total)}</span> em até{' '}
      <span className="font-bold text-text-primary">{display.count}x</span> de{' '}
      <span className="font-bold text-text-primary">{formatCurrency(display.value)}</span>{' '}
      <span className={display.interestFree ? 'text-success' : 'text-text-secondary'}>
        {suffix}
      </span>
    </>
  )
}

export function PaymentDetailsTrigger({
  price,
  paymentSettings,
  paymentIcons,
  layout = 'default',
}: PaymentDetailsTriggerProps) {
  const [open, setOpen] = useState(false)
  const rows = buildInstallmentTable(price, paymentSettings)
  const installmentDisplay = calcInstallmentDisplay(price, paymentSettings)

  if (rows.length === 0 || !installmentDisplay) return null

  const linkLabel =
    layout === 'product'
      ? 'Ver formas de parcelamento e pagamento'
      : 'Ver parcelas e formas de pagamento'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group text-left ${layout === 'product' ? 'w-full' : 'mt-2 w-full'}`}
        aria-haspopup="dialog"
      >
        {layout === 'product' ? (
          <div className="flex items-start gap-3 rounded-lg bg-surface-muted px-3 py-3 transition-colors group-hover:bg-border/40">
            <CreditCard className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Pagamento no cartão
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {formatProductInstallmentLine(installmentDisplay)}
              </p>
              <span className="mt-1.5 inline-block text-xs font-medium text-brand underline-offset-2 group-hover:underline">
                {linkLabel}
              </span>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-text-secondary">{installmentDisplay.label}</p>
            <span className="mt-1 inline-block text-xs font-medium text-brand group-hover:underline">
              {linkLabel}
            </span>
          </>
        )}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Pagamento" size="lg">
        <div className="space-y-6">
          <div>
            <p className="text-sm text-text-secondary">Valor do produto</p>
            <p className="text-2xl font-bold text-brand">{formatCurrency(price)}</p>
          </div>

          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
              <CreditCard className="size-4 text-brand" aria-hidden />
              Opções de parcelamento
            </h3>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Parcelas</th>
                    <th className="px-3 py-2.5 font-semibold">Valor</th>
                    <th className="px-3 py-2.5 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr key={row.count} className="text-text-primary">
                      <td className="px-3 py-2.5 font-medium">{row.count}x</td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {formatCurrency(row.installmentValue)}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {formatCurrency(row.total)}
                        {row.interestFree ? (
                          <span className="ml-1 text-xs text-success">s/ juros</span>
                        ) : (
                          <span className="ml-1 text-xs text-text-muted">c/ juros</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-text-muted">
              Parcela mínima de {formatCurrency(paymentSettings.minInstallmentValue)}.
              Até {paymentSettings.interestFreeInstallments}x sem juros.
            </p>
          </div>

          {paymentIcons.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-text-primary">
                Formas de pagamento aceitas
              </h3>
              <PaymentIconsRow icons={paymentIcons} size="md" />
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
