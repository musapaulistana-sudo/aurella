import { jsonError, jsonSuccess } from '@/lib/api/response'
import { getVorkpayClient } from '@/lib/vorkpay/client'

export async function GET(request: Request) {
  const transactionId = new URL(request.url).searchParams.get('transactionId')?.trim()
  if (!transactionId) {
    return jsonError('transactionId obrigatório', 400)
  }

  try {
    const result = await getVorkpayClient().getStatus(transactionId)
    return jsonSuccess(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Falha ao consultar estado'
    return jsonError(message, 502)
  }
}
