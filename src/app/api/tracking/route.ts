import { z } from 'zod'
import { jsonError, jsonSuccess } from '@/lib/api/response'
import {
  Track7Error,
  getTrackingByCode,
  getTrackingByOrderId,
  isTrack7Configured,
} from '@/lib/track7/client'
import { refreshOrderTrackingFromTrack7 } from '@/lib/track7/sync-order'
import { createAdminClient } from '@/lib/supabase/admin'

const querySchema = z
  .object({
    codigo: z.string().trim().min(1).max(80).optional(),
    code: z.string().trim().min(1).max(80).optional(),
    pedido: z.string().trim().min(1).max(80).optional(),
    order: z.string().trim().min(1).max(80).optional(),
  })
  .refine((v) => Boolean(v.codigo || v.code || v.pedido || v.order), {
    message: 'Informe um código de rastreio ou o ID do pedido',
  })

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export async function GET(request: Request) {
  if (!isTrack7Configured()) {
    return jsonError('Rastreio indisponível no momento. Tente mais tarde.', 503, 'CONFIG')
  }

  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse({
    codigo: searchParams.get('codigo') ?? undefined,
    code: searchParams.get('code') ?? undefined,
    pedido: searchParams.get('pedido') ?? undefined,
    order: searchParams.get('order') ?? undefined,
  })

  if (!parsed.success) {
    return jsonError('Informe um código de rastreio válido', 400, 'INVALID')
  }

  const trackingCode = (parsed.data.codigo ?? parsed.data.code)?.trim()
  const orderRef = (parsed.data.pedido ?? parsed.data.order)?.trim()

  try {
    let data =
      trackingCode != null
        ? await getTrackingByCode(trackingCode)
        : await getTrackingByOrderId(orderRef!)

    // Se consultou por código e temos transaction_id local, tenta atualizar o pedido
    if (data.transaction_id && looksLikeUuid(data.transaction_id)) {
      void refreshOrderTrackingFromTrack7(data.transaction_id)
    }

    // Se consultou por UUID da loja e Track7 não achou, tenta código local
    if (!trackingCode && orderRef && looksLikeUuid(orderRef) && !data.tracking_code) {
      const admin = createAdminClient()
      const { data: order } = await admin
        .from('orders')
        .select('tracking_code')
        .eq('id', orderRef)
        .maybeSingle()
      if (order?.tracking_code) {
        data = await getTrackingByCode(order.tracking_code)
      }
    }

    const eventsNewestFirst = [...data.events].reverse()

    return jsonSuccess({
      transaction_id: data.transaction_id,
      tracking_code: data.tracking_code,
      status: data.status,
      current_status: data.current_status,
      events: eventsNewestFirst,
      has_events: eventsNewestFirst.length > 0,
    })
  } catch (e) {
    if (e instanceof Track7Error) {
      return jsonError(e.message, e.status, e.code)
    }
    return jsonError('Não foi possível consultar o rastreio', 500)
  }
}
