import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

export type VorkpayCustomer = {
  name: string
  email: string
  phone: string
  address?: string
  city?: string
  postalCode?: string
  country?: string
}

export type VorkpayItem = {
  id: string
  name: string
  quantity: number
  priceInCents: number
}

export type VorkpayTrackingParameters = Record<string, string>

export type VorkpayCreatePaymentResult = {
  transactionId: string
  amount: number
  currency: string
}

export type VorkpayMultibancoResult = {
  entity: string
  reference: string
  amount: number
  expiresAt: string
}

export type VorkpayStatusResult = {
  transactionId: string
  externalOrderId?: string
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | string
  paymentMethod?: string
  amount?: number
  currency?: string
  paidAt?: string | null
  mb?: {
    entity?: string
    reference?: string
    expiresAt?: string
  }
}

type VorkpaySdk = {
  createPayment: (
    orderId: string,
    amount: number,
    customer: VorkpayCustomer,
    items: VorkpayItem[],
    trackingParameters?: VorkpayTrackingParameters | null,
    originToken?: string | null
  ) => Promise<VorkpayCreatePaymentResult>
  triggerMbway: (transactionId: string, phoneNumber: string) => Promise<{ success?: boolean; message?: string }>
  generateMultibanco: (transactionId: string) => Promise<VorkpayMultibancoResult>
  getStatus: (transactionId: string) => Promise<VorkpayStatusResult>
  verifyWebhook: (rawBody: string | object, signature: string | null | undefined) => boolean
}

function loadSdk(): VorkpaySdk {
  // Cliente oficial do ZIP NSQPAY (gera X-VP-Trace). Não substituir por fetch directo.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./vorkpay.js') as VorkpaySdk
}

export function getVorkpayClient(): VorkpaySdk {
  if (!process.env.VORKPAY_SECRET_KEY) {
    throw new Error('VORKPAY_SECRET_KEY not configured')
  }
  return loadSdk()
}

export function getVorkpayPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VORKPAY_PUBLIC_KEY ?? process.env.VORKPAY_PUBLIC_KEY ?? null
}

export { formatMultibancoReference, isPortugueseMobile } from '@/lib/vorkpay/format'
