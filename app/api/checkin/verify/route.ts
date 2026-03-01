import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { hashToken } from '@/lib/token'
// getJstDateString は不要: トークンに紐づく date を使用する
import { checkinVerifySchema, parseRequest } from '@/lib/validations'

/**
 * POST /api/checkin/verify
 * body: { token: string }
 * → トークン検証。有効なら { streamer_id, date, token_id, template } を返す
 */
export async function POST(req: NextRequest) {
  const supabase = createServerClient()

  const parsed = await parseRequest(checkinVerifySchema, req)
  if (!parsed.success) return parsed.error
  const { token } = parsed.data

  const token_hash = hashToken(token)
  const now = new Date().toISOString()

  const { data: tokenRow, error } = await supabase
    .from('checkin_tokens')
    .select('*')
    .eq('token_hash', token_hash)
    .single()

  if (error || !tokenRow) {
    return NextResponse.json({ valid: false, error: 'invalid token' }, { status: 401 })
  }

  // 期限切れチェック
  if (tokenRow.expires_at < now) {
    return NextResponse.json({ valid: false, error: 'token expired' }, { status: 401 })
  }

  // 使用済みチェック
  if (tokenRow.used_at) {
    return NextResponse.json({ valid: false, error: 'token already used' }, { status: 409 })
  }

  // 配信者のレベルを取得してテンプレを選択
  const { data: streamer } = await supabase
    .from('streamers')
    .select('level_override, level_current')
    .eq('id', tokenRow.streamer_id)
    .single()

  const effectiveLevel = streamer?.level_override ?? streamer?.level_current ?? null

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
      { valid: false, error: 'アクティブなテンプレートがありません' },
      { status: 503 }
    )
  }

  // 既にトークンの営業日の自己評価が存在するか確認
  const date: string = tokenRow.date
  const { data: existingCheck } = await supabase
    .from('self_checks')
    .select('id')
    .eq('streamer_id', tokenRow.streamer_id)
    .eq('date', date)
    .single()

  return NextResponse.json({
    valid: true,
    date: tokenRow.date,
    template,
    already_submitted: !!existingCheck,
  })
}
