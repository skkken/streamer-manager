import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdminAuth } from '@/lib/auth-guard'
import { parseRequest } from '@/lib/validations'
import { createLineChannelSchema } from '@/lib/validations'
import { captureApiError } from '@/lib/error-logger'
import { encrypt } from '@/lib/crypto'

/** GET /api/line-channels - 全チャネル一覧 */
export async function GET() {
  const { errorResponse } = await requireAdminAuth()
  if (errorResponse) return errorResponse

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('line_channels')
    .select('id, name, channel_id, is_active, webhook_path, created_at, updated_at')
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

/** POST /api/line-channels - チャネル作成 */
export async function POST(req: NextRequest) {
  const { errorResponse } = await requireAdminAuth()
  if (errorResponse) return errorResponse

  const parsed = await parseRequest(createLineChannelSchema, req)
  if (!parsed.success) return parsed.error

  const supabase = createServerClient()

  try {
    // webhook_path はトリガーで id に設定される（空文字で挿入）
    const { data, error } = await supabase
      .from('line_channels')
      .insert({
        name: parsed.data.name,
        channel_id: parsed.data.channel_id,
        channel_secret: encrypt(parsed.data.channel_secret),
        channel_access_token: encrypt(parsed.data.channel_access_token),
        webhook_path: '',
      })
      .select('id, name, channel_id, is_active, webhook_path, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    captureApiError(err, '/api/line-channels', 'POST')
    const message = err instanceof Error ? err.message : 'サーバーエラーが発生しました'
    console.error('[POST /api/line-channels] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
