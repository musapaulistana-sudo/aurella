import { createAdminClient } from '@/lib/supabase/admin'

export const PAYMENT_PROOF_BUCKET = 'payment-proofs'
export const PAYMENT_PROOF_MAX_BYTES = 5 * 1024 * 1024
export const PAYMENT_PROOF_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
] as const

export async function createPaymentProofSignedUrl(
  path: string | null | undefined,
  expiresInSeconds = 60 * 60
): Promise<string | null> {
  if (!path) return null
  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from(PAYMENT_PROOF_BUCKET)
    .createSignedUrl(path, expiresInSeconds)

  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
