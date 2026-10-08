import { createPublicClient, isSupabasePublicConfigured } from '@/lib/supabase/public'
import { getSiteSettings } from '@/lib/layout/queries'

export const revalidate = 3600

/**
 * Serve o favicon configurado no admin em /favicon.ico (via rewrite).
 * Sem isso, a Vercel devolve o ícone padrão e a aba do navegador ignora o <link rel="icon">.
 */
export async function GET() {
  if (!isSupabasePublicConfigured()) {
    return new Response(null, { status: 404 })
  }

  try {
    const supabase = createPublicClient()
    const settings = await getSiteSettings(supabase)
    const sourceUrl = settings.favicon_url?.trim()

    if (!sourceUrl) {
      return new Response(null, { status: 404 })
    }

    const upstream = await fetch(sourceUrl, {
      next: { revalidate: 3600 },
      headers: { Accept: 'image/*,*/*' },
    })

    if (!upstream.ok) {
      return new Response(null, { status: 404 })
    }

    const contentType = upstream.headers.get('content-type') ?? 'image/png'
    const body = await upstream.arrayBuffer()

    return new Response(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    })
  } catch {
    return new Response(null, { status: 404 })
  }
}
