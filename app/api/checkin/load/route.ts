import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getJstDateString } from '@/lib/jst'

/**
 * GET /api/checkin/load?streamer_id=xxx&date=YYYY-MM-DD
 *
 * テスト用直接モード。
 * - active テンプレを取得
 * - 既に当日の self_check があれば already_submitted=true
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const streamer_id = searchParams.get('streamer_id')
  const date = searchParams.get('date') ?? getJstDateString()

  if (!streamer_id) {
    return NextResponse.json({ error: 'streamer_id は必須' }, { status: 400 })
  }

  let supabase: ReturnType<typeof createServerClient>
  try {
    supabase = createServerClient()
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Supabase 設定エラー' },
      { status: 503 }
    )
  }

  // 配信者存在確認
  const { data: streamer, error: sErr } = await supabase
    .from('streamers')
    .select('id, display_name, level_current, level_override')
    .eq('id', streamer_id)
    .single()

  if (sErr || !streamer) {
    return NextResponse.json({ error: '配信者が見つかりません' }, { status: 404 })
  }

  // 有効レベルを算出（0はレベル未設定扱い）
  const effectiveLevel = streamer.level_override ?? (streamer.level_current || null)
  const { data: templates } = await supabase
    .from('self_check_templates')
    .select('*')
    .eq('is_active', true)

  const template =
    (templates ?? []).find((t) => t.for_level === effectiveLevel) ??
    (templates ?? [])[0] ??
    null

  if (!template) {
    return NextResponse.json(
      { error: 'アクティブなテンプレートがありません。/templates で作成してください。' },
      { status: 503 }
    )
  }

  // 送信済み確認
  const { data: existing } = await supabase
    .from('self_checks')
    .select('id')
    .eq('streamer_id', streamer_id)
    .eq('date', date)
    .single()

  return NextResponse.json({
    streamer_id,
    streamer_name: streamer.display_name,
    date,
    template,
    already_submitted: !!existing,
  })
}
