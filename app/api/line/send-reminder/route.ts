import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateToken, hashToken } from '@/lib/token'
import { getJstDateString, getTokenExpiry } from '@/lib/jst'
import { sendLineMessage } from '@/lib/line'
import { getMessageSettings } from '@/lib/messages'
import { requireAuth } from '@/lib/auth-guard'
import { sendReminderSchema, parseBody } from '@/lib/validations'
import { captureApiError } from '@/lib/error-logger'

/**
 * POST /api/line/send-reminder
 *
 * 未回答の配信者に手動でリマインドを送信する
 * Body: { streamer_ids: string[], date?: string }
 * date を指定すると過去の未入力日分のトークンを発行できる
 */
export async function POST(req: NextRequest) {
  const { errorResponse } = await requireAuth()
  if (errorResponse) return errorResponse

  try {
    const parsed = parseBody(sendReminderSchema, await req.json())
    if (!parsed.success) return parsed.error

    const { streamer_ids, date: requestDate } = parsed.data

    const targetDate = requestDate ?? getJstDateString()

    const supabase = createServerClient()
    const messages = await getMessageSettings()
    // 過去日付の場合、対象日ベースの有効期限が既に切れている可能性があるため
    // 「対象日ベース」と「現在日ベース（翌日12:00 JST）」の遅い方を使う
    const targetExpiry = getTokenExpiry(targetDate)
    const todayExpiry = getTokenExpiry() // 今日の翌日12:00 JST
    const expiresAt = (targetExpiry > todayExpiry ? targetExpiry : todayExpiry).toISOString()
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
            date: targetDate,
            token_hash: tokenHash,
            expires_at: expiresAt,
            used_at: null,
          },
          { onConflict: 'streamer_id,date' }
        )

      const checkinUrl = `${appUrl}/checkin?t=${rawToken}`
      // "2026-02-28" → "2月28日"
      const [, mm, dd] = targetDate.split('-')
      const dateLabel = `${Number(mm)}月${Number(dd)}日`
      const text = messages.line_checkin_reminder
        .replace('{name}', streamer.display_name)
        .replace('{url}', checkinUrl)
        .replace('{date}', dateLabel)

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
  } catch (err) {
    captureApiError(err, '/api/line/send-reminder', 'POST')
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '送信処理中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
