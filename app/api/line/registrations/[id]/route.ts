import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth-guard'
import { registerLineUserSchema, parseBody } from '@/lib/validations'
import { captureApiError } from '@/lib/error-logger'

type Params = { params: Promise<{ id: string }> }

/**
 * POST /api/line/registrations/[id]
 * 登録待ちLINEユーザーを配信者として登録する
 * body: { display_name, tiktok_id?, agency_name?, manager_name? }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { errorResponse } = await requireAuth()
  if (errorResponse) return errorResponse

  const supabase = createServerClient()
  const { id } = await params

  const parsed = parseBody(registerLineUserSchema, await req.json())
  if (!parsed.success) return parsed.error
  const { display_name, tiktok_id, office_name, agency_name, manager_name, line_channel_id } = parsed.data

  // 登録待ちレコード取得
  const { data: reg, error: regErr } = await supabase
    .from('line_registrations')
    .select('*')
    .eq('id', id)
    .single()

  if (regErr || !reg) {
    return NextResponse.json({ error: '登録情報が見つかりません' }, { status: 404 })
  }
  if (reg.status === 'registered') {
    return NextResponse.json({ error: '既に登録済みです' }, { status: 409 })
  }

  // 配信者を作成
  const { data: streamer, error: streamerErr } = await supabase
    .from('streamers')
    .insert({
      display_name: display_name.trim(),
      line_user_id: reg.line_user_id,
      tiktok_id: tiktok_id?.trim() || reg.tiktok_id || null,
      agency_name: office_name?.trim() || agency_name?.trim() || reg.office_name || null,
      manager_name: manager_name?.trim() || null,
      line_channel_id: line_channel_id || reg.line_channel_id || null,
      status: 'active',
      notify_enabled: true,
    })
    .select()
    .single()

  if (streamerErr) {
    captureApiError(streamerErr, '/api/line/registrations/[id]', 'POST')
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }

  // 登録待ちを登録済みにマーク
  await supabase
    .from('line_registrations')
    .update({ status: 'registered' })
    .eq('id', id)

  return NextResponse.json(streamer, { status: 201 })
}

/**
 * DELETE /api/line/registrations/[id]
 * 登録待ちを削除（スパム・誤登録の除去用）
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { errorResponse: delAuthErr } = await requireAuth()
  if (delAuthErr) return delAuthErr

  const supabase = createServerClient()
  const { id } = await params

  const { error } = await supabase
    .from('line_registrations')
    .delete()
    .eq('id', id)

  if (error) {
    captureApiError(error, '/api/line/registrations/[id]', 'DELETE')
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
  return new NextResponse(null, { status: 204 })
}
