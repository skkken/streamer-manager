import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getJstDateString } from '@/lib/jst'

/**
 * GET /api/line-jobs?date=YYYY-MM-DD&status=queued
 * ジョブ一覧を取得（管理画面用）
 */
export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') ?? getJstDateString()
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
