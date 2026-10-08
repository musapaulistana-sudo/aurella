import { type EmailOtpType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { sanitizeRedirectPath } from '@/lib/auth/safe-redirect'
import { getAuthSiteOrigin } from '@/lib/auth/site-origin'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

/**
 * Valida token_hash dos e-mails Auth (confirmação / recovery).
 * Templates usam: {{ .SiteURL }}/auth/confirm?token_hash=...&type=...
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = sanitizeRedirectPath(
    searchParams.get('next'),
    type === 'recovery' ? '/conta/redefinir-senha' : '/conta'
  )

  const siteOrigin = getAuthSiteOrigin(request)
  const loginError = new URL('/conta/login', siteOrigin)
  loginError.searchParams.set('error', 'link_invalido')

  if (!token_hash || !type) {
    return NextResponse.redirect(loginError)
  }

  let response = NextResponse.redirect(new URL(next, siteOrigin))
  const supabase = createRouteHandlerClient(request, response)

  const { error } = await supabase.auth.verifyOtp({ type, token_hash })

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[auth/confirm]', error.message)
    }
    return NextResponse.redirect(loginError)
  }

  return response
}
