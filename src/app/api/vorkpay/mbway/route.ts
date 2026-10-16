import { z } from 'zod'
import { jsonError, jsonSuccess } from '@/lib/api/response'
import { getVorkpayClient, isPortugueseMobile } from '@/lib/vorkpay/client'

const schema = z.object({
  transactionId: z.string().min(1),
  phoneNumber: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine(isPortugueseMobile, 'Telemóvel deve ser 9XXXXXXXX'),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('Dados inválidos', 400)
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? 'Dados inválidos', 400)
  }

  try {
    const result = await getVorkpayClient().triggerMbway(
      parsed.data.transactionId,
      parsed.data.phoneNumber
    )
    return jsonSuccess(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Falha ao disparar MB WAY'
    return jsonError(message, 502)
  }
}
