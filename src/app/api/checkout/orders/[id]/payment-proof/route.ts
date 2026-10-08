import { jsonError, jsonSuccess } from '@/lib/api/response'
import {
  assertOrderAccess,
  getOptionalSessionUserId,
  OrderAccessError,
  readGuestTokenFromRequest,
} from '@/lib/checkout/order-access'
import {
  PAYMENT_PROOF_ALLOWED_TYPES,
  PAYMENT_PROOF_BUCKET,
  PAYMENT_PROOF_MAX_BYTES,
  createPaymentProofSignedUrl,
} from '@/lib/checkout/payment-proof'
import { createAdminClient } from '@/lib/supabase/admin'

function isAllowedType(type: string): type is (typeof PAYMENT_PROOF_ALLOWED_TYPES)[number] {
  return (PAYMENT_PROOF_ALLOWED_TYPES as readonly string[]).includes(type)
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const userId = await getOptionalSessionUserId()
  const guestToken = readGuestTokenFromRequest(request)

  try {
    await assertOrderAccess({ orderId: id, userId, guestToken })
  } catch (e) {
    if (e instanceof OrderAccessError) {
      return jsonError('Pedido não encontrado', 404, 'ORDER_NOT_FOUND')
    }
    return jsonError('Erro ao validar pedido', 500)
  }

  const admin = createAdminClient()
  const { data: order, error: orderError } = await admin
    .from('orders')
    .select(
      'id, status, payment_status, payment_method, payment_proof_path, payment_proof_filename, payment_proof_uploaded_at'
    )
    .eq('id', id)
    .maybeSingle()

  if (orderError || !order) {
    return jsonError('Pedido não encontrado', 404, 'ORDER_NOT_FOUND')
  }

  if (order.payment_status === 'paid' || order.status !== 'pending') {
    return jsonError('Este pedido já foi processado e não aceita comprovante', 400)
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return jsonError('Arquivo inválido', 400)
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return jsonError('Envie a imagem ou PDF do comprovante', 400)
  }

  if (!isAllowedType(file.type)) {
    return jsonError('Formato não permitido. Use JPEG, PNG, WebP, GIF ou PDF.', 400)
  }

  if (file.size <= 0 || file.size > PAYMENT_PROOF_MAX_BYTES) {
    return jsonError('Arquivo inválido. Máximo 5 MB.', 400)
  }

  const extFromName = file.name.split('.').pop()?.toLowerCase()
  const ext =
    extFromName && /^[a-z0-9]{2,5}$/.test(extFromName)
      ? extFromName
      : file.type === 'application/pdf'
        ? 'pdf'
        : 'jpg'

  const storagePath = `${id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await admin.storage
    .from(PAYMENT_PROOF_BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[payment-proof/upload]', uploadError.message)
    }
    return jsonError('Falha no envio do comprovante. Tente novamente.', 400)
  }

  if (order.payment_proof_path) {
    await admin.storage.from(PAYMENT_PROOF_BUCKET).remove([order.payment_proof_path])
  }

  const uploadedAt = new Date().toISOString()
  const { data: updated, error: updateError } = await admin
    .from('orders')
    .update({
      payment_proof_path: storagePath,
      payment_proof_filename: file.name.slice(0, 180),
      payment_proof_mime_type: file.type,
      payment_proof_uploaded_at: uploadedAt,
      payment_proof_url: null,
      updated_at: uploadedAt,
    })
    .eq('id', id)
    .select(
      'id, payment_proof_filename, payment_proof_mime_type, payment_proof_uploaded_at, payment_proof_path'
    )
    .single()

  if (updateError || !updated) {
    await admin.storage.from(PAYMENT_PROOF_BUCKET).remove([storagePath])
    return jsonError('Não foi possível salvar o comprovante', 400)
  }

  const signedUrl = await createPaymentProofSignedUrl(updated.payment_proof_path)

  return jsonSuccess(
    {
      orderId: updated.id,
      filename: updated.payment_proof_filename,
      mimeType: updated.payment_proof_mime_type,
      uploadedAt: updated.payment_proof_uploaded_at,
      previewUrl: signedUrl,
    },
    'Comprovante enviado. Nossa equipe vai analisar o pagamento.',
    201
  )
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const userId = await getOptionalSessionUserId()
  const guestToken = readGuestTokenFromRequest(request)

  try {
    await assertOrderAccess({ orderId: id, userId, guestToken })
  } catch (e) {
    if (e instanceof OrderAccessError) {
      return jsonError('Pedido não encontrado', 404, 'ORDER_NOT_FOUND')
    }
    return jsonError('Erro ao validar pedido', 500)
  }

  const admin = createAdminClient()
  const { data: order } = await admin
    .from('orders')
    .select(
      'payment_proof_path, payment_proof_filename, payment_proof_mime_type, payment_proof_uploaded_at'
    )
    .eq('id', id)
    .maybeSingle()

  if (!order?.payment_proof_path) {
    return jsonSuccess({
      hasProof: false,
      filename: null,
      mimeType: null,
      uploadedAt: null,
      previewUrl: null,
    })
  }

  const previewUrl = await createPaymentProofSignedUrl(order.payment_proof_path)

  return jsonSuccess({
    hasProof: true,
    filename: order.payment_proof_filename,
    mimeType: order.payment_proof_mime_type,
    uploadedAt: order.payment_proof_uploaded_at,
    previewUrl,
  })
}
