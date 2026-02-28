import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

// GET /api/streamers/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = createServerClient()
  const { id } = await params
  const { data, error } = await supabase
    .from('streamers')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }
  return NextResponse.json(data)
}

// PATCH /api/streamers/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  const supabase = createServerClient()
  const { id } = await params
  const body = await req.json()

  const allowedFields = ['display_name', 'status', 'line_user_id', 'tiktok_id', 'agency_name', 'manager_name', 'notify_enabled', 'level_override', 'notes']
  const updates: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key]
  }

  const { data, error } = await supabase
    .from('streamers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

// DELETE /api/streamers/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const supabase = createServerClient()
  const { id } = await params
  const { error } = await supabase
    .from('streamers')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return new NextResponse(null, { status: 204 })
}
