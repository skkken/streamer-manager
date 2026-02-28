import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/auth-middleware'
import { rateLimit } from '@/lib/rate-limit'

const PROTECTED_PAGE_PREFIXES = [
  '/streamers',
  '/templates',
  '/board',
  '/admin',
]

/** レート制限から免除するAPIパス */
const RATE_LIMIT_EXEMPT = ['/api/cron/', '/api/line/webhook']

/** 公開APIパス（厳しい制限を適用） */
const PUBLIC_API_PATHS = ['/api/checkin/', '/api/self-check']

const WINDOW_MS = 60 * 1000 // 1分
const PUBLIC_LIMIT = 10 // 公開API: 10 req/min
const DEFAULT_LIMIT = 30 // 認証済みAPI: 30 req/min

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function checkApiRateLimit(
  request: NextRequest
): NextResponse | null {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/api/')) return null

  // 免除パスはスキップ
  if (RATE_LIMIT_EXEMPT.some((p) => pathname.startsWith(p))) return null

  const ip = getClientIp(request)
  const isPublic = PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))
  const limit = isPublic ? PUBLIC_LIMIT : DEFAULT_LIMIT
  const key = `${ip}:${isPublic ? 'public' : 'api'}`

  const result = rateLimit(key, limit, WINDOW_MS)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(result.reset),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.reset),
        },
      }
    )
  }

  return null
}

export async function middleware(request: NextRequest) {
  // APIルートのレート制限チェック（認証処理より先に実行）
  const rateLimitResponse = checkApiRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  const { user, supabaseResponse } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isProtectedPage =
    pathname === '/' ||
    PROTECTED_PAGE_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
    )

  if (isProtectedPage && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  if (pathname === '/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/streamers'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!monitoring|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
