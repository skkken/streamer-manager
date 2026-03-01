import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient } from '@/lib/supabase/auth-server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'invite' | 'recovery' | 'email' | null

  const redirectUrl = request.nextUrl.clone()

  if (!token_hash || !type) {
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  const supabase = await createAuthServerClient()
  const { error } = await supabase.auth.verifyOtp({ token_hash, type })

  if (error) {
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('error', '招待リンクが無効または期限切れです')
    return NextResponse.redirect(redirectUrl)
  }

  if (type === 'invite') {
    redirectUrl.pathname = '/auth/set-password'
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl)
  }

  redirectUrl.pathname = '/streamers'
  redirectUrl.search = ''
  return NextResponse.redirect(redirectUrl)
}
