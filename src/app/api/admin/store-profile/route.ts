import { createAdminClient } from '@/lib/supabase/admin'
import { jsonError, jsonSuccess } from '@/lib/api/response'
import { requireAdminUser } from '@/lib/auth/require-admin'
import { normalizeAnalyticsFieldsForSave } from '@/lib/analytics/normalize'
import { getStoreProfile, updateStoreProfile } from '@/lib/store-profile/queries'
import { updateStoreProfileSchema } from '@/schemas/store-profile-schema'

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

export async function GET() {
  const auth = await requireAdmin()
  if (auth instanceof Response) return auth

  const admin = createAdminClient()
  const profile = await getStoreProfile(admin)

  if (!profile) {
    return jsonError('Configurações da loja não encontradas', 404)
  }

  const { data: pages } = await admin
    .from('footer_pages')
    .select('slug, title')
    .eq('active', true)
    .order('title')

  return jsonSuccess({
    ...profile,
    policyPages: pages ?? [],
  })
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof Response) return auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('Dados inválidos', 400)
  }

  const parsed = updateStoreProfileSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? 'Dados inválidos', 400)
  }

  if (Object.keys(parsed.data).length === 0) {
    return jsonError('Nenhum campo para atualizar', 400)
  }

  const analyticsKeys = [
    'google_tag_manager_id',
    'google_analytics_id',
    'google_ads_id',
    'google_ads_conversion_id',
    'microsoft_clarity_id',
  ] as const

  const payload: Record<string, unknown> = { ...parsed.data }
  const hasAnalyticsUpdate = analyticsKeys.some((key) => key in parsed.data)
  if (hasAnalyticsUpdate) {
    const normalized = normalizeAnalyticsFieldsForSave({
      google_tag_manager_id:
        parsed.data.google_tag_manager_id !== undefined
          ? parsed.data.google_tag_manager_id
          : undefined,
      google_analytics_id:
        parsed.data.google_analytics_id !== undefined
          ? parsed.data.google_analytics_id
          : undefined,
      google_ads_id:
        parsed.data.google_ads_id !== undefined ? parsed.data.google_ads_id : undefined,
      google_ads_conversion_id:
        parsed.data.google_ads_conversion_id !== undefined
          ? parsed.data.google_ads_conversion_id
          : undefined,
      microsoft_clarity_id:
        parsed.data.microsoft_clarity_id !== undefined
          ? parsed.data.microsoft_clarity_id
          : undefined,
    })
    for (const key of analyticsKeys) {
      if (key in parsed.data) {
        payload[key] = normalized[key]
      }
    }
  }

  const admin = createAdminClient()
  const { data, migrationNeeded } = await updateStoreProfile(admin, payload)

  if (!data) {
    return jsonError(
      'Não foi possível salvar. Aplique a migration de perfil da loja / analytics no Supabase.',
      400,
      'MIGRATION_REQUIRED'
    )
  }

  return jsonSuccess(
    { ...data, migrationNeeded },
    migrationNeeded
      ? 'Salvo parcialmente — aplique a migration 20260804182524_store_analytics_ads_conversion.sql para Ads/conversão.'
      : 'Dados da loja atualizados'
  )
}
