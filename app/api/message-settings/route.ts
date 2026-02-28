import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// GET /api/message-settings
export async function GET() {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('message_settings')
      .select('key, value')
      .order('key')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const settings: Record<string, string> = {}
    for (const row of data ?? []) settings[row.key] = row.value
    return NextResponse.json(settings)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'error' }, { status: 500 })
  }
}

// PATCH /api/message-settings
// body: { key: string; value: string }[]
export async function PATCH(req: NextRequest) {
  let body: { key: string; value: string }[]
  try {
    body = await req.json()
    if (!Array.isArray(body)) throw new Error()
  } catch {
    return NextResponse.json({ error: 'body must be an array' }, { status: 400 })
  }

  try {
    const supabase = createServerClient()
    const now = new Date().toISOString()
    const rows = body.map(({ key, value }) => ({ key, value, updated_at: now }))
    const { error } = await supabase
      .from('message_settings')
      .upsert(rows, { onConflict: 'key' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'error' }, { status: 500 })
  }
}
