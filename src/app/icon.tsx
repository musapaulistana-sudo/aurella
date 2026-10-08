import { createPublicClient, isSupabasePublicConfigured } from '@/lib/supabase/public'
import { getSiteSettings } from '@/lib/layout/queries'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'
export const revalidate = 3600

async function fetchConfiguredFavicon(): Promise<Response | null> {
  if (!isSupabasePublicConfigured()) return null

  const supabase = createPublicClient()
  const settings = await getSiteSettings(supabase)
  const sourceUrl = settings.favicon_url?.trim()
  if (!sourceUrl) return null

  const upstream = await fetch(sourceUrl, {
    next: { revalidate: 3600 },
    headers: { Accept: 'image/*,*/*' },
  })
  if (!upstream.ok) return null

  const contentType = upstream.headers.get('content-type') ?? 'image/png'
  const body = await upstream.arrayBuffer()

  return new Response(body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  })
}

/** Convenção do App Router: gera /icon e substitui o favicon padrão do Next/Vercel. */
export default async function Icon() {
  const configured = await fetchConfiguredFavicon()
  if (configured) return configured

  // Fallback mínimo se ainda não houver favicon no admin
  const { ImageResponse } = await import('next/og')
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#111827',
          color: 'white',
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        A
      </div>
    ),
    { ...size }
  )
}
