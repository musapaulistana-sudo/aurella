import { NextRequest, NextResponse } from 'next/server'
import { sanitizeRedirectPath } from '@/lib/auth/safe-redirect'
import { getAuthSiteOrigin } from '@/lib/auth/site-origin'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeRedirectPath(searchParams.get('next'))
  const siteOrigin = getAuthSiteOrigin(request)

  if (!code) {
    return NextResponse.redirect(new URL('/conta/login', siteOrigin))
  }

  let response = NextResponse.redirect(new URL(next, siteOrigin))
  const supabase = createRouteHandlerClient(request, response)

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[auth/callback]', error.message)
    }
    const loginUrl = new URL('/conta/login', siteOrigin)
    loginUrl.searchParams.set('error', 'link_invalido')
    return NextResponse.redirect(loginUrl)
  }

  return response
}
