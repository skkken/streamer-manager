import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createHmac } from 'crypto'
import { getMessageSettings } from '@/lib/messages'

/** LINE Reply API でメッセージを送信 */
async function replyMessage(replyToken: string, text: string): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) return
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }],
    }),
  })
}

/** LINE Profile API でdisplay nameを取得 */
async function getLineDisplayName(lineUserId: string): Promise<string | null> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) return null
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    return (data.displayName as string) ?? null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-line-signature') ?? ''
  const secret = process.env.LINE_CHANNEL_SECRET ?? ''

  // 署名検証
  if (!secret) {
    return NextResponse.json({ error: 'LINE_CHANNEL_SECRET not set' }, { status: 500 })
  }
  const hmac = createHmac('sha256', secret)
  hmac.update(body)
  const expected = hmac.digest('base64')
  if (signature !== expected) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: { events: Record<string, unknown>[] }
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = createServerClient()
  const messages = await getMessageSettings()

  for (const event of payload.events) {
    if (event.type !== 'follow' && event.type !== 'message') continue
    const source = event.source as Record<string, string> | undefined
    if (source?.type !== 'user') continue

    const lineUserId = source.userId
    if (!lineUserId) continue

    const replyToken = event.replyToken as string | undefined

    // 既に配信者として登録済みならスキップ
    const { data: existingStreamer } = await supabase
      .from('streamers')
      .select('id')
      .eq('line_user_id', lineUserId)
      .maybeSingle()
    if (existingStreamer) continue

    // --- follow イベント: 新規登録フロー開始 ---
    if (event.type === 'follow') {
      const { data: existingReg } = await supabase
        .from('line_registrations')
        .select('id')
        .eq('line_user_id', lineUserId)
        .maybeSingle()
      if (existingReg) continue

      const lineDisplayName = await getLineDisplayName(lineUserId)
      await supabase.from('line_registrations').insert({
        line_user_id: lineUserId,
        line_display_name: lineDisplayName,
        status: 'pending',
        step: 'ask_name',
      })

      if (replyToken) {
        await replyMessage(replyToken, messages.line_reg_welcome)
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
          await replyMessage(replyToken, messages.line_reg_ask_tiktok)
        }
      } else if (reg.step === 'ask_tiktok') {
        await supabase
          .from('line_registrations')
          .update({ tiktok_id: text, step: 'ask_office' })
          .eq('id', reg.id)
        if (replyToken) {
          await replyMessage(replyToken, messages.line_reg_ask_office)
        }
      } else if (reg.step === 'ask_office') {
        await supabase
          .from('line_registrations')
          .update({ office_name: text, step: 'done' })
          .eq('id', reg.id)
        if (replyToken) {
          await replyMessage(replyToken, messages.line_reg_done)
        }
      }
    }
  }

  return NextResponse.json({ ok: true })
}
