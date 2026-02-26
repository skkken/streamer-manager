import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// GET /api/streamers  — 一覧取得
export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('streamers')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

// POST /api/streamers  — 作成
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const body = await req.json()

  const { display_name, line_user_id, status, notify_enabled, notes } = body

  if (!display_name || !line_user_id) {
    return NextResponse.json(
      { error: 'display_name と line_user_id は必須です' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('streamers')
    .insert({ display_name, line_user_id, status, notify_enabled, notes })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
