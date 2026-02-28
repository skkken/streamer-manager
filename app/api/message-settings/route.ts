import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth-guard'
import { messageSettingsSchema, parseBody } from '@/lib/validations'

// GET /api/message-settings
export async function GET() {
  const { errorResponse } = await requireAuth()
  if (errorResponse) return errorResponse

  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('message_settings')
      .select('key, value')
      .order('key')
    if (error) {
      console.error('GET /api/message-settings:', error)
      return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
    }
    const settings: Record<string, string> = {}
    for (const row of data ?? []) settings[row.key] = row.value
    return NextResponse.json(settings)
  } catch (e) {
    console.error('GET /api/message-settings:', e)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

// PATCH /api/message-settings
// body: { key: string; value: string }[]
export async function PATCH(req: NextRequest) {
  const { errorResponse: patchAuthErr } = await requireAuth()
  if (patchAuthErr) return patchAuthErr

  const parsed = parseBody(messageSettingsSchema, await req.json())
  if (!parsed.success) return parsed.error

  try {
    const supabase = createServerClient()
    const now = new Date().toISOString()
    const rows = parsed.data.map(({ key, value }) => ({ key, value, updated_at: now }))
    const { error } = await supabase
      .from('message_settings')
      .upsert(rows, { onConflict: 'key' })
    if (error) {
      console.error('PATCH /api/message-settings:', error)
      return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('PATCH /api/message-settings:', e)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
