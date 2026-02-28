import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateToken, hashToken } from '@/lib/token'
import { getJstDateString, getTokenExpiry } from '@/lib/jst'

/**
 * POST /api/checkin/token
 * body: { streamer_id: string }
 * → TOKENを生成してDBに保存し、生トークンを返す（LINEメッセージに埋め込む用）
 * 既にその日のトークンがあれば上書きしない（upsert で同じstreamer_id/dateはスキップ）
 */
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { streamer_id } = await req.json()

  if (!streamer_id) {
    return NextResponse.json({ error: 'streamer_id は必須' }, { status: 400 })
  }

  const date = getJstDateString()
  const rawToken = generateToken()
  const token_hash = hashToken(rawToken)
  const expires_at = getTokenExpiry(date).toISOString()

  // UNIQUE(streamer_id, date) なので既存行がある場合はスキップ
  const { data: existing } = await supabase
    .from('checkin_tokens')
    .select('id')
    .eq('streamer_id', streamer_id)
    .eq('date', date)
    .single()

  if (existing) {
    // 既存トークンは返せない（生値は保存していない）ので、再発行はしない
    return NextResponse.json(
      { error: 'トークンは本日分が既に存在します' },
      { status: 409 }
    )
  }

  const { error } = await supabase.from('checkin_tokens').insert({
    streamer_id,
    date,
    token_hash,
    expires_at,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')
  return NextResponse.json({
    token: rawToken,
    url: `${appUrl}/checkin?t=${rawToken}`,
    expires_at,
  })
}
