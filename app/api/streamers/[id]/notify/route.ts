import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth-guard'
import { notifyToggleSchema, parseRequest } from '@/lib/validations'
import { captureApiError } from '@/lib/error-logger'

type Params = { params: Promise<{ id: string }> }

/**
 * PATCH /api/streamers/[id]/notify
 * body: { notify_enabled: boolean }
 * 通知ON/OFFを切り替え
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { errorResponse } = await requireAuth()
  if (errorResponse) return errorResponse

  const supabase = createServerClient()
  const { id } = await params

  const parsed = await parseRequest(notifyToggleSchema, req)
  if (!parsed.success) return parsed.error
  const { notify_enabled } = parsed.data

  const { data, error } = await supabase
    .from('streamers')
    .update({ notify_enabled })
    .eq('id', id)
    .select('id, display_name, notify_enabled')
    .single()

  if (error) {
    captureApiError(error, '/api/streamers/[id]/notify', 'PATCH')
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
  return NextResponse.json(data)
}
