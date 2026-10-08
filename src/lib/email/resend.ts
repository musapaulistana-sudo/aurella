import { Resend } from 'resend'

let client: Resend | null = null

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return null
  if (!client) client = new Resend(apiKey)
  return client
}

export function getOrderEmailFrom(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    'Atlas Cosmeticos <atendimento@atlascosmeticos.com>'
  )
}

export function getStoreContactEmail(): string {
  return process.env.STORE_CONTACT_EMAIL?.trim() || 'atendimento@atlascosmeticos.com'
}
