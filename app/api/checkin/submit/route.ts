import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { hashToken } from '@/lib/token'
// getJstDateString は不要: トークンに紐づく date を使用する
import { generateAiResult } from '@/lib/ai'
import { TemplateField } from '@/lib/types'
import { checkinSubmitSchema, parseBody } from '@/lib/validations'

/**
 * POST /api/checkin/submit
 * body: { token: string, answers: Record<string, boolean|string>, memo: string }
 *
 * 処理フロー:
 * 1. トークン検証
 * 2. self_checks に upsert（冪等）
 * 3. token の used_at を更新
 * 4. checkin_thanks ジョブをキューに積む（非同期）
 * 5. AI結果を返す
 */
export async function POST(req: NextRequest) {
  const supabase = createServerClient()

  const parsed = parseBody(checkinSubmitSchema, await req.json())
  if (!parsed.success) return parsed.error
  const { token, answers, memo } = parsed.data

  const token_hash = hashToken(token)
  const now = new Date().toISOString()

  // ---- 1. トークン検証 ----
  const { data: tokenRow } = await supabase
    .from('checkin_tokens')
    .select('*')
    .eq('token_hash', token_hash)
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

  // ---- 2. 配信者レベルに対応するアクティブテンプレ取得（fallback: レベル0）----
  const { data: streamerForLevel } = await supabase
    .from('streamers')
    .select('level_current, level_override')
    .eq('id', tokenRow.streamer_id)
    .single()

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
    return NextResponse.json(
      { error: 'アクティブなテンプレートがありません' },
      { status: 503 }
    )
  }

  // ---- 3. AI判定（ルール生成） ----
  const fields: TemplateField[] = template.schema?.fields ?? []
  const aiResult = generateAiResult(fields, answers, memo ?? '')

  // ---- 4. self_checks upsert（トークンに紐づく営業日を使用） ----
  const date: string = tokenRow.date
  const { data: check, error: checkError } = await supabase
    .from('self_checks')
    .upsert(
      {
        streamer_id: tokenRow.streamer_id,
        date,
        template_id: template.id,
        answers,
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
    // LINEの失敗でも入力は成功させるため、ここで return はしない
    console.error('self_checks upsert error:', checkError)
  }

  // ---- 5. token を使用済みにする ----
  await supabase
    .from('checkin_tokens')
    .update({ used_at: now })
    .eq('id', tokenRow.id)

  // ---- 6. checkin_thanks ジョブをキューに積む（冪等） ----
  await supabase
    .from('line_jobs')
    .upsert(
      {
        streamer_id: tokenRow.streamer_id,
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
