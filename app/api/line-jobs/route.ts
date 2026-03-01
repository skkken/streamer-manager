import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getJstDateString } from '@/lib/jst'
import { requireAdminAuth } from '@/lib/auth-guard'
import { captureApiError } from '@/lib/error-logger'

/**
 * GET /api/line-jobs?date=YYYY-MM-DD&status=queued
 * ジョブ一覧を取得（管理画面用）
 */
export async function GET(req: NextRequest) {
  const { errorResponse } = await requireAdminAuth()
  if (errorResponse) return errorResponse

  const supabase = createServerClient()
  const { searchParams } = new URL(req.url)
  const dateParam = searchParams.get('date')
  if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json({ error: '日付は YYYY-MM-DD 形式で入力してください' }, { status: 400 })
  }
  const date = dateParam ?? getJstDateString()
  const status = searchParams.get('status')

  let query = supabase
    .from('line_jobs')
    .select(`
      *,
      streamer:streamers(display_name, line_user_id)
    `)
    .eq('date', date)
    .order('created_at', { ascending: false })
    .limit(200)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) {
    captureApiError(error, '/api/line-jobs', 'GET')
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
  return NextResponse.json(data)
}
