import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { hashToken } from '@/lib/token'
import { getJstDateString } from '@/lib/jst'

/**
 * POST /api/checkin/verify
 * body: { token: string }
 * → トークン検証。有効なら { streamer_id, date, token_id, template } を返す
 */
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { token } = await req.json()

  if (!token) {
    return NextResponse.json({ valid: false, error: 'token は必須' }, { status: 400 })
  }

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

  // アクティブテンプレを取得
  const { data: template } = await supabase
    .from('self_check_templates')
    .select('*')
    .eq('is_active', true)
    .single()

  if (!template) {
    return NextResponse.json(
      { valid: false, error: 'アクティブなテンプレートがありません' },
      { status: 503 }
    )
  }

  // 既に今日の自己評価が存在するか確認
  const date = getJstDateString()
  const { data: existingCheck } = await supabase
    .from('self_checks')
    .select('id')
    .eq('streamer_id', tokenRow.streamer_id)
    .eq('date', date)
    .single()

  return NextResponse.json({
    valid: true,
    streamer_id: tokenRow.streamer_id,
    token_id: tokenRow.id,
    date: tokenRow.date,
    template,
    already_submitted: !!existingCheck,
  })
}
