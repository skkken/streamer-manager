import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth-guard'
import { createStreamerSchema, parseBody } from '@/lib/validations'
import { captureApiError } from '@/lib/sentry'

// GET /api/streamers  — 一覧取得
export async function GET(req: NextRequest) {
  const { errorResponse } = await requireAuth()
  if (errorResponse) return errorResponse

  const supabase = createServerClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('streamers')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    captureApiError(error, '/api/streamers', 'GET')
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
  return NextResponse.json(data)
}

// POST /api/streamers  — 作成
export async function POST(req: NextRequest) {
  const { errorResponse } = await requireAuth()
  if (errorResponse) return errorResponse

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'リクエストボディが不正です' }, { status: 400 })
  }

  const parsed = parseBody(createStreamerSchema, body)
  if (!parsed.success) return parsed.error

  const { display_name, line_user_id, agency_name, tiktok_id, manager_name, status, notify_enabled, notes } = parsed.data

  let supabase: ReturnType<typeof createServerClient>
  try {
    supabase = createServerClient()
  } catch (e) {
    captureApiError(e, '/api/streamers', 'POST')
    return NextResponse.json(
      { error: 'サービスが一時的に利用できません' },
      { status: 503 }
    )
  }

  try {
    // .select('id') を付けて return=representation を強制し、空ボディ問題を回避
    const { data, error } = await supabase
      .from('streamers')
      .insert({ display_name, line_user_id, agency_name: agency_name ?? null, tiktok_id: tiktok_id ?? null, manager_name: manager_name ?? null, status, notify_enabled, notes })
      .select('id')

    if (error) {
      if (error.code === '23505' && error.message.includes('line_user_id')) {
        return NextResponse.json(
          { error: 'このLINE IDはすでに別の配信者に登録されています' },
          { status: 409 }
        )
      }
      captureApiError(error, '/api/streamers', 'POST')
      return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
    }
    return NextResponse.json({ success: true, id: data?.[0]?.id }, { status: 201 })
  } catch (e) {
    captureApiError(e, '/api/streamers', 'POST')
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
