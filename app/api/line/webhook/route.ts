import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createHmac } from 'crypto'

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

  for (const event of payload.events) {
    // follow または message イベントのみ処理
    if (event.type !== 'follow' && event.type !== 'message') continue
    const source = event.source as Record<string, string> | undefined
    if (source?.type !== 'user') continue

    const lineUserId = source.userId
    if (!lineUserId) continue

    // 既に配信者として登録済みならスキップ
    const { data: existingStreamer } = await supabase
      .from('streamers')
      .select('id')
      .eq('line_user_id', lineUserId)
      .maybeSingle()
    if (existingStreamer) continue

    // 既に登録待ちならスキップ
    const { data: existingReg } = await supabase
      .from('line_registrations')
      .select('id')
      .eq('line_user_id', lineUserId)
      .maybeSingle()
    if (existingReg) continue

    // LINE display name 取得
    const lineDisplayName = await getLineDisplayName(lineUserId)

    // 登録待ちに追加
    await supabase.from('line_registrations').insert({
      line_user_id: lineUserId,
      line_display_name: lineDisplayName,
      status: 'pending',
    })
  }

  // LINE はレスポンスが遅いと再送するため 200 を返す
  return NextResponse.json({ ok: true })
}
