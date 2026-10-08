import { createPublicClient, isSupabasePublicConfigured } from '@/lib/supabase/public'
import { getSiteSettings } from '@/lib/layout/queries'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'
export const revalidate = 3600

export default async function AppleIcon() {
  if (!isSupabasePublicConfigured()) {
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
            fontSize: 72,
            fontWeight: 700,
          }}
        >
          A
        </div>
      ),
      { ...size }
    )
  }

  const supabase = createPublicClient()
  const settings = await getSiteSettings(supabase)
  const sourceUrl = settings.favicon_url?.trim()

  if (sourceUrl) {
    const upstream = await fetch(sourceUrl, {
      next: { revalidate: 3600 },
      headers: { Accept: 'image/*,*/*' },
    })
    if (upstream.ok) {
      const contentTypeHeader = upstream.headers.get('content-type') ?? 'image/png'
      const body = await upstream.arrayBuffer()
      return new Response(body, {
        headers: {
          'Content-Type': contentTypeHeader,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      })
    }
  }

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
          fontSize: 72,
          fontWeight: 700,
        }}
      >
        A
      </div>
    ),
    { ...size }
  )
}
