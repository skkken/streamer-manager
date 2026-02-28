import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getJstDateString } from '@/lib/jst'
import { generateAiResult } from '@/lib/ai'
import { TemplateField } from '@/lib/types'
import { getMessageSettings } from '@/lib/messages'

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
  const { streamer_id, date: bodyDate, answers, memo, diamonds, streaming_minutes } = body

  if (!streamer_id) {
    return NextResponse.json({ error: 'streamer_id は必須' }, { status: 400 })
  }

  const date = bodyDate ?? getJstDateString()

  // 配信者確認
  const { data: streamer } = await supabase
    .from('streamers')
    .select('id, level_current, level_override')
    .eq('id', streamer_id)
    .single()

  if (!streamer) {
    return NextResponse.json({ error: '配信者が見つかりません' }, { status: 404 })
  }

  // 有効レベルを算出（0はレベル未設定扱い、fallback: 最初のテンプレ）
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
      { error: 'アクティブなテンプレートがありません' },
      { status: 503 }
    )
  }

  // AI判定
  const fields: TemplateField[] = template.schema?.fields ?? []
  const messages = await getMessageSettings()
  const aiResult = generateAiResult(fields, answers ?? {}, memo ?? '', messages)

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

  // daily_earnings upsert
  const diamondsNum = typeof diamonds === 'number' && diamonds >= 0 ? diamonds : 0
  const streamingMinutesNum = typeof streaming_minutes === 'number' && streaming_minutes >= 0 ? streaming_minutes : 0
  await supabase
    .from('daily_earnings')
    .upsert(
      { streamer_id, date, diamonds: diamondsNum, streaming_minutes: streamingMinutesNum },
      { onConflict: 'streamer_id,date', ignoreDuplicates: false }
    )

  // 当月 diamonds_mtd 再計算
  const monthKey = date.slice(0, 7) + '-01'
  const nextMonth = (() => {
    const [y, m] = monthKey.split('-').map(Number)
    const next = new Date(y, m, 1)
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`
  })()
  const { data: earningsRows } = await supabase
    .from('daily_earnings')
    .select('diamonds')
    .eq('streamer_id', streamer_id)
    .gte('date', monthKey)
    .lt('date', nextMonth)

  const diamondsMtd = (earningsRows ?? []).reduce((sum, r) => sum + (r.diamonds ?? 0), 0)

  // level_thresholds_monthly からレベル算出
  const { data: thresholds } = await supabase
    .from('level_thresholds_monthly')
    .select('level, threshold_diamonds_mtd')
    .order('level', { ascending: false })

  let levelMtd = 0
  for (const t of thresholds ?? []) {
    if (diamondsMtd >= t.threshold_diamonds_mtd) {
      levelMtd = t.level
      break
    }
  }

  // streamer_monthly_stats upsert
  await supabase
    .from('streamer_monthly_stats')
    .upsert(
      { streamer_id, month: monthKey, diamonds_mtd: diamondsMtd, level_mtd: levelMtd },
      { onConflict: 'streamer_id,month', ignoreDuplicates: false }
    )

  // streamers.level_current / level_max 更新
  const { data: streamerLatest } = await supabase
    .from('streamers')
    .select('level_current, level_max')
    .eq('id', streamer_id)
    .single()

  if (streamerLatest) {
    const newLevelCurrent = Math.max(streamerLatest.level_current ?? 0, levelMtd)
    const newLevelMax = Math.max(streamerLatest.level_max ?? 0, levelMtd)
    if (newLevelCurrent !== streamerLatest.level_current || newLevelMax !== streamerLatest.level_max) {
      await supabase
        .from('streamers')
        .update({ level_current: newLevelCurrent, level_max: newLevelMax })
        .eq('id', streamer_id)
    }
  }

  return NextResponse.json({
    success: true,
    ai_type: aiResult.ai_type,
    ai_comment: aiResult.ai_comment,
    ai_next_action: aiResult.ai_next_action,
    ai_negative_detected: aiResult.ai_negative_detected,
    overall_score: aiResult.overall_score,
  })
}
