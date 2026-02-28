import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateToken, hashToken } from '@/lib/token'
import { getJstDateString, getTokenExpiry } from '@/lib/jst'
import { sendLineMessage } from '@/lib/line'
import { getMessageSettings } from '@/lib/messages'

/**
 * POST /api/line/send-reminder
 *
 * 未回答の配信者に手動でリマインドを送信する
 * Body: { streamer_ids: string[] }
 */
export async function POST(req: NextRequest) {
  const { streamer_ids } = (await req.json()) as { streamer_ids: string[] }

  if (!streamer_ids?.length) {
    return NextResponse.json({ error: '配信者が指定されていません' }, { status: 400 })
  }

  const supabase = createServerClient()
  const messages = await getMessageSettings()
  const today = getJstDateString()
  const expiresAt = getTokenExpiry(today).toISOString()
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000')

  const { data: streamers } = await supabase
    .from('streamers')
    .select('id, display_name, line_user_id')
    .in('id', streamer_ids)

  if (!streamers?.length) {
    return NextResponse.json({ error: '対象の配信者が見つかりません' }, { status: 404 })
  }

  let sent = 0
  let failed = 0
  const errors: string[] = []

  for (const streamer of streamers) {
    if (!streamer.line_user_id) {
      errors.push(`${streamer.display_name}: LINE未連携`)
      failed++
      continue
    }

    // トークン発行（既存があれば上書き）
    const rawToken = generateToken()
    const tokenHash = hashToken(rawToken)
    await supabase
      .from('checkin_tokens')
      .upsert(
        {
          streamer_id: streamer.id,
          date: today,
          token_hash: tokenHash,
          expires_at: expiresAt,
          used_at: null,
        },
        { onConflict: 'streamer_id,date' }
      )

    const checkinUrl = `${appUrl}/checkin?t=${rawToken}`
    const text = (
      messages.line_checkin_reminder ??
      '【リマインド】\n{name}さん、本日の自己評価がまだ入力されていません。\n以下のリンクから入力をお願いします。\n\n{url}\n\n※URLは本日中のみ有効です。'
    )
      .replace('{name}', streamer.display_name)
      .replace('{url}', checkinUrl)

    const result = await sendLineMessage(streamer.line_user_id, [
      { type: 'text', text },
    ])

    if (result.ok) {
      sent++
    } else {
      errors.push(`${streamer.display_name}: ${result.error}`)
      failed++
    }
  }

  return NextResponse.json({ sent, failed, errors })
}
