import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth-guard'
import { captureApiError } from '@/lib/error-logger'

export async function GET() {
  const { errorResponse } = await requireAuth()
  if (errorResponse) return errorResponse

  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('cron_settings')
      .select('*')
      .order('job_key')

    if (error) {
      captureApiError(error, '/api/cron-settings', 'GET')
      return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (e) {
    captureApiError(e, '/api/cron-settings', 'GET')
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const { errorResponse } = await requireAuth()
  if (errorResponse) return errorResponse

  try {
    const body = await req.json()
    const { job_key, enabled } = body

    if (typeof job_key !== 'string' || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'job_key (string) と enabled (boolean) が必須です' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const { error } = await supabase
      .from('cron_settings')
      .update({ enabled })
      .eq('job_key', job_key)

    if (error) {
      captureApiError(error, '/api/cron-settings', 'PATCH')
      return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    captureApiError(e, '/api/cron-settings', 'PATCH')
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
