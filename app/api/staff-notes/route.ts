import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth-guard'
import { createStaffNoteSchema, parseRequest } from '@/lib/validations'
import { captureApiError } from '@/lib/error-logger'

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
    captureApiError(error, '/api/staff-notes', 'GET')
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
  return NextResponse.json(data)
}

// POST /api/staff-notes
export async function POST(req: NextRequest) {
  const { errorResponse: postAuthErr } = await requireAuth()
  if (postAuthErr) return postAuthErr

  const supabase = createServerClient()

  const parsed = await parseRequest(createStaffNoteSchema, req)
  if (!parsed.success) return parsed.error

  const { streamer_id, date, category, current_state, action, next_action, status } = parsed.data

  const { data, error } = await supabase
    .from('staff_notes')
    .insert({ streamer_id, date, category, current_state, action, next_action, status })
    .select()
    .single()

  if (error) {
    captureApiError(error, '/api/staff-notes', 'POST')
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
