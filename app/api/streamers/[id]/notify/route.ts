import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

/**
 * PATCH /api/streamers/[id]/notify
 * body: { notify_enabled: boolean }
 * 通知ON/OFFを切り替え
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const supabase = createServerClient()
  const { id } = await params
  const { notify_enabled } = await req.json()

  if (typeof notify_enabled !== 'boolean') {
    return NextResponse.json({ error: 'notify_enabled (boolean) は必須' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('streamers')
    .update({ notify_enabled })
    .eq('id', id)
    .select('id, display_name, notify_enabled')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
