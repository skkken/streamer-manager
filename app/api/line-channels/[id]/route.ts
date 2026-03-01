import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdminAuth } from '@/lib/auth-guard'
import { parseRequest } from '@/lib/validations'
import { updateLineChannelSchema } from '@/lib/validations'
import { captureApiError } from '@/lib/error-logger'
import { encrypt } from '@/lib/crypto'

type Params = { params: Promise<{ id: string }> }

/** GET /api/line-channels/[id] */
export async function GET(_req: NextRequest, { params }: Params) {
  const { errorResponse } = await requireAdminAuth()
  if (errorResponse) return errorResponse

  const { id } = await params
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('line_channels')
    .select('id, name, channel_id, is_active, webhook_path, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'チャネルが見つかりません' }, { status: 404 })
  }
  return NextResponse.json(data)
}

/** PATCH /api/line-channels/[id] */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { errorResponse } = await requireAdminAuth()
  if (errorResponse) return errorResponse

  const { id } = await params
  const parsed = await parseRequest(updateLineChannelSchema, req)
  if (!parsed.success) return parsed.error

  const supabase = createServerClient()

  try {
    const updateData = { ...parsed.data }
    if (updateData.channel_secret) {
      updateData.channel_secret = encrypt(updateData.channel_secret)
    }
    if (updateData.channel_access_token) {
      updateData.channel_access_token = encrypt(updateData.channel_access_token)
    }

    const { data, error } = await supabase
      .from('line_channels')
      .update(updateData)
      .eq('id', id)
      .select('id, name, channel_id, is_active, webhook_path, updated_at')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'チャネルが見つかりません' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch (err) {
    captureApiError(err, '/api/line-channels/[id]', 'PATCH')
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

/** DELETE /api/line-channels/[id] */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { errorResponse } = await requireAdminAuth()
  if (errorResponse) return errorResponse

  const { id } = await params
  const supabase = createServerClient()

  // 紐づく配信者がいないか確認
  const { count } = await supabase
    .from('streamers')
    .select('id', { count: 'exact', head: true })
    .eq('line_channel_id', id)

  if (count && count > 0) {
    return NextResponse.json(
      { error: `このチャネルに紐づく配信者が${count}人います。先に配信者を別チャネルに移動してください。` },
      { status: 409 }
    )
  }

  const { error } = await supabase
    .from('line_channels')
    .delete()
    .eq('id', id)

  if (error) {
    captureApiError(error, '/api/line-channels/[id]', 'DELETE')
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
  return new NextResponse(null, { status: 204 })
}
