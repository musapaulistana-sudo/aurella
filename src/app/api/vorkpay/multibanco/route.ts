import { z } from 'zod'
import { jsonError, jsonSuccess } from '@/lib/api/response'
import { getVorkpayClient } from '@/lib/vorkpay/client'

const schema = z.object({
  transactionId: z.string().min(1),
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
    return jsonError('transactionId obrigatório', 400)
  }

  try {
    const result = await getVorkpayClient().generateMultibanco(parsed.data.transactionId)
    return jsonSuccess(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Falha ao gerar Multibanco'
    return jsonError(message, 502)
  }
}
