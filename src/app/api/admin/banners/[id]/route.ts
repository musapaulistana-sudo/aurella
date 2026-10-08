import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { jsonError, jsonSuccess } from '@/lib/api/response'
import { requireAdminUser } from '@/lib/auth/require-admin'
import { BANNER_COLUMNS } from '@/lib/banners/queries'
import { isAllowedBannerMime } from '@/lib/image/banner-mime'
import { prepareBannerImage } from '@/lib/image/prepare-banner-image'
import { updateBannerSchema } from '@/schemas/banner-schema'

const paramsSchema = z.object({ id: z.string().uuid() })

async function requireAdmin() {
  try {
    return await requireAdminUser()
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') {
      return jsonError('Não autorizado', 401, 'UNAUTHORIZED')
    }
    if (e instanceof Error && e.message === 'FORBIDDEN') {
      return jsonError('Acesso negado', 403, 'FORBIDDEN')
    }
    return jsonError('Erro interno', 500)
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth instanceof Response) return auth

  const parsedParams = paramsSchema.safeParse(await context.params)
  if (!parsedParams.success) {
    return jsonError('Banner inválido', 400)
  }
  const { id } = parsedParams.data

  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return jsonError('Arquivo inválido', 400)
    }

    const file = formData.get('file')
    if (file instanceof File) {
      return patchWithImage(id, formData)
    }

    const parsed = updateBannerSchema.safeParse({
      title: formData.get('title') ?? undefined,
      alt_text: formData.get('alt_text') || null,
      link_href: formData.get('link_href') || null,
      active: formData.get('active') !== 'false',
      device_target: formData.get('device_target') ?? undefined,
    })

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? 'Dados inválidos', 400)
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('home_banners')
      .update(parsed.data)
      .eq('id', id)
      .select(BANNER_COLUMNS)
      .single()

    if (error || !data) {
      return jsonError('Não foi possível atualizar o banner', 400)
    }

    revalidatePath('/')
    return jsonSuccess(data, 'Banner atualizado')
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('Dados inválidos', 400)
  }

  const parsed = updateBannerSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? 'Dados inválidos', 400)
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('home_banners')
    .update(parsed.data)
    .eq('id', id)
    .select(BANNER_COLUMNS)
    .single()

  if (error || !data) {
    return jsonError('Não foi possível atualizar o banner', 400)
  }

  revalidatePath('/')
  return jsonSuccess(data, 'Banner atualizado')
}

async function patchWithImage(id: string, formData: FormData) {
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return jsonError('Envie uma imagem', 400)
  }

  if (!isAllowedBannerMime(file.type)) {
    return jsonError('Formato não permitido. Use JPEG, PNG ou WebP.', 400)
  }

  const meta = updateBannerSchema.safeParse({
    title: formData.get('title') ?? undefined,
    alt_text: formData.get('alt_text') || null,
    link_href: formData.get('link_href') || null,
    active: formData.get('active') !== 'false',
    device_target: formData.get('device_target') ?? undefined,
  })

  if (!meta.success) {
    return jsonError(meta.error.issues[0]?.message ?? 'Dados inválidos', 400)
  }

  const supabase = await createClient()
  const { data: existing, error: fetchError } = await supabase
    .from('home_banners')
    .select('storage_path')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return jsonError('Banner não encontrado', 404)
  }

  let prepared
  try {
    prepared = await prepareBannerImage(file)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Falha ao processar a imagem'
    return jsonError(message, 400)
  }

  const storagePath = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${prepared.extension}`

  const { error: uploadError } = await supabase.storage
    .from('banners')
    .upload(storagePath, prepared.buffer, {
      contentType: prepared.mimeType,
      upsert: false,
    })

  if (uploadError) {
    return jsonError('Falha no upload da nova imagem', 400)
  }

  const { data: urlData } = supabase.storage.from('banners').getPublicUrl(storagePath)

  const updatePayload = {
    ...meta.data,
    image_url: urlData.publicUrl,
    storage_path: storagePath,
    width: prepared.width,
    height: prepared.height,
    file_size: prepared.size,
  }

  const { data, error } = await supabase
    .from('home_banners')
    .update(updatePayload)
    .eq('id', id)
    .select(BANNER_COLUMNS)
    .single()

  if (error || !data) {
    await supabase.storage.from('banners').remove([storagePath])
    return jsonError('Não foi possível atualizar o banner', 400)
  }

  if (existing.storage_path) {
    await supabase.storage.from('banners').remove([existing.storage_path])
  }

  revalidatePath('/')
  return jsonSuccess(data, 'Banner atualizado')
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth instanceof Response) return auth

  const parsedParams = paramsSchema.safeParse(await context.params)
  if (!parsedParams.success) {
    return jsonError('Banner inválido', 400)
  }
  const { id } = parsedParams.data

  const supabase = await createClient()
  const { data: existing, error: fetchError } = await supabase
    .from('home_banners')
    .select('storage_path')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return jsonError('Banner não encontrado', 404)
  }

  const { error } = await supabase.from('home_banners').delete().eq('id', id)

  if (error) {
    return jsonError('Não foi possível remover o banner', 400)
  }

  if (existing.storage_path) {
    await supabase.storage.from('banners').remove([existing.storage_path])
  }

  revalidatePath('/')
  return jsonSuccess({ ok: true }, 'Banner removido')
}
