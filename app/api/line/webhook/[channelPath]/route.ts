import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { getMessageSettings } from '@/lib/messages'
import { generateToken, hashToken } from '@/lib/token'
import { getJstDateString, getTokenExpiry } from '@/lib/jst'
import { replyLineMessage, getLineDisplayName } from '@/lib/line'
import { getLineChannelByWebhookPath } from '@/lib/line-channels'
import { getAppUrl } from '@/lib/app-url'

type Params = { params: Promise<{ channelPath: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { channelPath } = await params

  // DB からチャネル取得
  const channel = await getLineChannelByWebhookPath(channelPath)
  if (!channel) {
    return NextResponse.json({ error: 'Unknown channel' }, { status: 404 })
  }

  const body = await req.text()
  const signature = req.headers.get('x-line-signature') ?? ''

  // チャネル固有の secret で署名検証
  const hmac = createHmac('sha256', channel.channel_secret)
  hmac.update(body)
  const expected = hmac.digest('base64')
  const sigBuf = Buffer.from(signature, 'base64')
  const expBuf = Buffer.from(expected, 'base64')
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: { events: Record<string, unknown>[] }
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const token = channel.channel_access_token
  const supabase = createServerClient()
  const messages = await getMessageSettings()

  for (const event of payload.events) {
    if (event.type !== 'follow' && event.type !== 'message') continue
    const source = event.source as Record<string, string> | undefined
    if (source?.type !== 'user') continue

    const lineUserId = source.userId
    if (!lineUserId) continue

    const replyToken = event.replyToken as string | undefined

    // 既に配信者として登録済みか確認
    const { data: existingStreamer } = await supabase
      .from('streamers')
      .select('id, display_name')
      .eq('line_user_id', lineUserId)
      .maybeSingle()

    // --- 登録済み配信者: 「配信終了」コマンド処理 ---
    if (existingStreamer && event.type === 'message') {
      const msg = event.message as Record<string, unknown> | undefined
      if (msg?.type === 'text') {
        const text = (msg.text as string).trim()
        const keyword = messages.line_stream_end_keyword ?? '配信終了'
        if (text === keyword && replyToken) {
          const today = getJstDateString()
          const expiresAt = getTokenExpiry(today).toISOString()
          const rawToken = generateToken()
          const tokenHash = hashToken(rawToken)

          // トークン発行（未使用の場合のみ上書き、使用済みならスキップ）
          const { data: existingToken } = await supabase
            .from('checkin_tokens')
            .select('id, used_at')
            .eq('streamer_id', existingStreamer.id)
            .eq('date', today)
            .maybeSingle()

          if (!existingToken) {
            await supabase.from('checkin_tokens').insert({
              streamer_id: existingStreamer.id,
              date: today,
              token_hash: tokenHash,
              expires_at: expiresAt,
            })
          } else if (!existingToken.used_at) {
            await supabase
              .from('checkin_tokens')
              .update({ token_hash: tokenHash, expires_at: expiresAt })
              .eq('id', existingToken.id)
              .is('used_at', null)
          }

          const appUrl = getAppUrl()
          const checkinUrl = `${appUrl}/checkin?t=${rawToken}`

          const [, mm, dd] = today.split('-')
          const dateLabel = `${Number(mm)}月${Number(dd)}日`
          const replyText = (messages.line_stream_end_reply ?? '配信お疲れさまでした！\n以下のリンクから{date}の自己評価を入力してください。\n\n{url}\n\n※URLは翌日昼まで有効です。')
            .replace('{date}', dateLabel)
            .replace('{url}', checkinUrl)
          await replyLineMessage(replyToken, replyText, token)
        }
      }
      continue
    }

    if (existingStreamer) continue

    // --- follow イベント: 新規登録フロー開始 ---
    if (event.type === 'follow') {
      const { data: existingReg } = await supabase
        .from('line_registrations')
        .select('id')
        .eq('line_user_id', lineUserId)
        .maybeSingle()
      if (existingReg) continue

      const lineDisplayName = await getLineDisplayName(lineUserId, token)
      await supabase.from('line_registrations').insert({
        line_user_id: lineUserId,
        line_display_name: lineDisplayName,
        line_channel_id: channel.id,
        office_name: channel.name,
        status: 'pending',
        step: 'ask_name',
      })

      if (replyToken) {
        await replyLineMessage(replyToken, messages.line_reg_welcome, token)
      }
      continue
    }

    // --- message イベント: 会話フロー処理 ---
    if (event.type === 'message') {
      const msg = event.message as Record<string, unknown> | undefined
      if (msg?.type !== 'text') continue
      const text = (msg.text as string).trim()

      const { data: reg } = await supabase
        .from('line_registrations')
        .select('id, step')
        .eq('line_user_id', lineUserId)
        .maybeSingle()

      if (!reg) continue

      if (reg.step === 'ask_name') {
        await supabase
          .from('line_registrations')
          .update({ input_name: text, step: 'ask_tiktok' })
          .eq('id', reg.id)
        if (replyToken) {
          await replyLineMessage(replyToken, messages.line_reg_ask_tiktok, token)
        }
      } else if (reg.step === 'ask_tiktok') {
        // チャネルから事務所が判明しているので ask_office をスキップ
        await supabase
          .from('line_registrations')
          .update({ tiktok_id: text, step: 'done' })
          .eq('id', reg.id)
        if (replyToken) {
          await replyLineMessage(replyToken, messages.line_reg_done, token)
        }
      } else if (reg.step === 'ask_office') {
        // 旧フロー互換: ask_office ステップが残っている場合
        await supabase
          .from('line_registrations')
          .update({ office_name: text, step: 'done' })
          .eq('id', reg.id)
        if (replyToken) {
          await replyLineMessage(replyToken, messages.line_reg_done, token)
        }
      }
    }
  }

  return NextResponse.json({ ok: true })
}
