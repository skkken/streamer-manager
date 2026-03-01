import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient } from '@/lib/supabase/auth-server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'invite' | 'recovery' | 'email' | null

  const redirectUrl = request.nextUrl.clone()
  const supabase = await createAuthServerClient()

  // PKCE フロー（@supabase/ssr v0.4+ のデフォルト）
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      redirectUrl.pathname = '/login'
      redirectUrl.search = ''
      redirectUrl.searchParams.set('error', '招待リンクが無効または期限切れです')
      return NextResponse.redirect(redirectUrl)
    }

    // redirectTo に ?type=invite を含めているため判定可能
    if (type === 'invite') {
      redirectUrl.pathname = '/auth/set-password'
      redirectUrl.search = ''
      return NextResponse.redirect(redirectUrl)
    }

    redirectUrl.pathname = '/streamers'
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl)
  }

  // レガシーフロー（token_hash）
  if (!token_hash || !type) {
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

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
