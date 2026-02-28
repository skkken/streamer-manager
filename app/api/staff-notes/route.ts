import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth-guard'

// GET /api/staff-notes?streamer_id=xxx
export async function GET(req: NextRequest) {
  const { errorResponse } = await requireAuth()
  if (errorResponse) return errorResponse

  const supabase = createServerClient()
  const { searchParams } = new URL(req.url)
  const streamer_id = searchParams.get('streamer_id')

  let query = supabase
    .from('staff_notes')
    .select('*')
    .order('created_at', { ascending: false })

  if (streamer_id) {
    query = query.eq('streamer_id', streamer_id)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

// POST /api/staff-notes
export async function POST(req: NextRequest) {
  const { errorResponse: postAuthErr } = await requireAuth()
  if (postAuthErr) return postAuthErr

  const supabase = createServerClient()
  const body = await req.json()

  const { streamer_id, date, category, current_state, action, next_action, status } = body

  if (!streamer_id || !date) {
    return NextResponse.json({ error: 'streamer_id と date は必須' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('staff_notes')
    .insert({ streamer_id, date, category, current_state, action, next_action, status })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
