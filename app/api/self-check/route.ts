import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { hashToken } from '@/lib/token'
// getJstDateString は不要: トークンに紐づく date を使用する
import { generateAiResult } from '@/lib/ai'
import { TemplateField } from '@/lib/types'
import { getMessageSettings } from '@/lib/messages'

/**
 * POST /api/self-check
 * body: { token, answers, memo, diamonds }
 *
 * 処理フロー:
 * 1. バリデーション
 * 2. トークン検証
 * 3. JST日付取得
 * 4. アクティブテンプレ取得 → AI判定
 * 5. self_checks upsert（既存処理を維持）
 * 6. token 使用済みマーク
 * 7. checkin_thanks ジョブをキューに積む
 * 8. daily_earnings upsert（streamer_id, date）
 * 9. 当月 diamonds_mtd を SUM で再計算
 * 10. level_thresholds_monthly から level_mtd (0-4) を算出
 * 11. streamer_monthly_stats upsert
 * 12. streamers.level_current = max(level_current, level_mtd)
 * 13. streamers.level_max = max(level_max, level_mtd)
 */
export async function POST(req: NextRequest) {
  const supabase = createServerClient()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'リクエストボディが不正です' }, { status: 400 })
  }

  const { token, answers, memo, diamonds, streaming_minutes } = body

  if (!token) {
    return NextResponse.json({ error: 'token は必須' }, { status: 400 })
  }
  if (typeof diamonds !== 'number' || !Number.isFinite(diamonds) || diamonds < 0) {
    return NextResponse.json({ error: 'diamonds は 0 以上の数値が必須です' }, { status: 400 })
  }
  const streamingMinutesNum = typeof streaming_minutes === 'number' && streaming_minutes >= 0 ? streaming_minutes : 0

  const tokenHash = hashToken(token as string)
  const now = new Date().toISOString()

  // ---- 2. トークン検証 ----
  const { data: tokenRow } = await supabase
    .from('checkin_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .single()

  if (!tokenRow) {
    return NextResponse.json({ error: 'invalid token' }, { status: 401 })
  }
  if (tokenRow.expires_at < now) {
    return NextResponse.json({ error: 'token expired' }, { status: 401 })
  }
  if (tokenRow.used_at) {
    return NextResponse.json({ error: 'token already used' }, { status: 409 })
  }

  const streamerId = tokenRow.streamer_id

  // ---- 3. トークンに紐づく日付（営業日ベース）を使用 ----
  const date: string = tokenRow.date

  // ---- 4. 配信者のレベルを取得 ----
  const { data: streamerForLevel } = await supabase
    .from('streamers')
    .select('level_current, level_override')
    .eq('id', streamerId)
    .single()

  // ---- 5. レベルに対応するアクティブテンプレ取得（0はレベル未設定扱い、fallback: 最初のテンプレ）----
  const effectiveLevel = streamerForLevel?.level_override ?? (streamerForLevel?.level_current || null)

  const { data: allTemplates } = await supabase
    .from('self_check_templates')
    .select('*')
    .eq('is_active', true)

  const template =
    (allTemplates ?? []).find((t) => t.for_level === effectiveLevel) ??
    (allTemplates ?? [])[0] ??
    null

  if (!template) {
    return NextResponse.json({ error: 'アクティブなテンプレートがありません' }, { status: 503 })
  }

  const fields: TemplateField[] = template.schema?.fields ?? []
  const messages = await getMessageSettings()
  const aiResult = generateAiResult(
    fields,
    (answers as Record<string, boolean | string>) ?? {},
    (memo as string) ?? '',
    messages
  )

  // ---- 5. self_checks upsert ----
  const { error: checkError } = await supabase
    .from('self_checks')
    .upsert(
      {
        streamer_id: streamerId,
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
    .select()
    .single()

  if (checkError) {
    console.error('self_checks upsert error:', checkError)
  }

  // ---- 6. token を使用済みにする ----
  await supabase
    .from('checkin_tokens')
    .update({ used_at: now })
    .eq('id', tokenRow.id)

  // ---- 7. checkin_thanks ジョブをキューに積む ----
  await supabase
    .from('line_jobs')
    .upsert(
      {
        streamer_id: streamerId,
        date,
        kind: 'checkin_thanks',
        status: 'queued',
        attempts: 0,
      },
      { onConflict: 'streamer_id,date,kind', ignoreDuplicates: true }
    )

  // ---- 8. daily_earnings upsert ----
  await supabase
    .from('daily_earnings')
    .upsert(
      { streamer_id: streamerId, date, diamonds, streaming_minutes: streamingMinutesNum },
      { onConflict: 'streamer_id,date', ignoreDuplicates: false }
    )

  // ---- 9. 当月 diamonds_mtd を SUM で再計算 ----
  const monthKey = date.slice(0, 7) + '-01' // YYYY-MM-01
  const { data: earningsRows } = await supabase
    .from('daily_earnings')
    .select('diamonds')
    .eq('streamer_id', streamerId)
    .gte('date', monthKey)
    .lt('date', nextMonthKey(monthKey))

  const diamondsMtd = (earningsRows ?? []).reduce((sum, r) => sum + (r.diamonds ?? 0), 0)

  // ---- 10. level_thresholds_monthly から level_mtd を算出 ----
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

  // ---- 11. streamer_monthly_stats upsert ----
  await supabase
    .from('streamer_monthly_stats')
    .upsert(
      { streamer_id: streamerId, month: monthKey, diamonds_mtd: diamondsMtd, level_mtd: levelMtd },
      { onConflict: 'streamer_id,month', ignoreDuplicates: false }
    )

  // ---- 12 & 13. streamers.level_current, level_max 更新 ----
  const { data: streamer } = await supabase
    .from('streamers')
    .select('level_current, level_max')
    .eq('id', streamerId)
    .single()

  if (streamer) {
    const newLevelCurrent = Math.max(streamer.level_current ?? 0, levelMtd)
    const newLevelMax = Math.max(streamer.level_max ?? 0, levelMtd)
    if (newLevelCurrent !== streamer.level_current || newLevelMax !== streamer.level_max) {
      await supabase
        .from('streamers')
        .update({ level_current: newLevelCurrent, level_max: newLevelMax })
        .eq('id', streamerId)
    }
  }

  return NextResponse.json({
    success: true,
    ai_type: aiResult.ai_type,
    ai_comment: aiResult.ai_comment,
    ai_next_action: aiResult.ai_next_action,
    ai_negative_detected: aiResult.ai_negative_detected,
    overall_score: aiResult.overall_score,
    diamonds_mtd: diamondsMtd,
    level_mtd: levelMtd,
  })
}

/** YYYY-MM-01 → 翌月の YYYY-MM-01 */
function nextMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  // JS Date month は 0-indexed のため、month (1-indexed) をそのまま渡すと翌月になる
  const next = new Date(year, month, 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`
}
