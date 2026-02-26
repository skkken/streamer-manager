import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getJstDateString } from '@/lib/jst'
import { generateAiResult } from '@/lib/ai'
import { TemplateField } from '@/lib/types'

/**
 * POST /api/checkin/direct
 * body: { streamer_id, date, answers, memo }
 *
 * トークン不要のテスト用送信エンドポイント。
 * 本番は /api/checkin/submit（TOKEN必須）を使う。
 *
 * 処理:
 * 1. アクティブテンプレ取得
 * 2. AI判定
 * 3. self_checks upsert
 * 4. checkin_thanks ジョブをキュー（あれば）
 */
export async function POST(req: NextRequest) {
  let supabase: ReturnType<typeof createServerClient>
  try {
    supabase = createServerClient()
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Supabase 設定エラー' },
      { status: 503 }
    )
  }
  const body = await req.json()
  const { streamer_id, date: bodyDate, answers, memo } = body

  if (!streamer_id) {
    return NextResponse.json({ error: 'streamer_id は必須' }, { status: 400 })
  }

  const date = bodyDate ?? getJstDateString()

  // 配信者確認
  const { data: streamer } = await supabase
    .from('streamers')
    .select('id')
    .eq('id', streamer_id)
    .single()

  if (!streamer) {
    return NextResponse.json({ error: '配信者が見つかりません' }, { status: 404 })
  }

  // アクティブテンプレ取得
  const { data: template } = await supabase
    .from('self_check_templates')
    .select('*')
    .eq('is_active', true)
    .single()

  if (!template) {
    return NextResponse.json(
      { error: 'アクティブなテンプレートがありません' },
      { status: 503 }
    )
  }

  // AI判定
  const fields: TemplateField[] = template.schema?.fields ?? []
  const aiResult = generateAiResult(fields, answers ?? {}, memo ?? '')

  // self_checks upsert（UNIQUE(streamer_id, date) で冪等）
  const { error: upsertErr } = await supabase
    .from('self_checks')
    .upsert(
      {
        streamer_id,
        date,
        template_id: template.id,
        answers: answers ?? {},
        memo: memo ?? null,
        overall_score: aiResult.overall_score,
        ai_type: aiResult.ai_type,
        ai_comment: aiResult.ai_comment,
        ai_next_action: aiResult.ai_next_action,
        ai_negative_detected: aiResult.ai_negative_detected,
      },
      { onConflict: 'streamer_id,date', ignoreDuplicates: false }
    )

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  }

  // checkin_thanks ジョブをキュー（冪等）
  await supabase
    .from('line_jobs')
    .upsert(
      {
        streamer_id,
        date,
        kind: 'checkin_thanks',
        status: 'queued',
        attempts: 0,
      },
      { onConflict: 'streamer_id,date,kind', ignoreDuplicates: true }
    )

  return NextResponse.json({
    success: true,
    ai_type: aiResult.ai_type,
    ai_comment: aiResult.ai_comment,
    ai_next_action: aiResult.ai_next_action,
    ai_negative_detected: aiResult.ai_negative_detected,
    overall_score: aiResult.overall_score,
  })
}
