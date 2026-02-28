import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const { errorResponse } = await requireAuth()
  if (errorResponse) return errorResponse

  const { searchParams } = req.nextUrl
  const limit = Math.min(Number(searchParams.get('limit') || '50'), 100)
  const offset = Number(searchParams.get('offset') || '0')

  const supabase = createServerClient()
  const { data, error, count } = await supabase
    .from('error_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }

  return NextResponse.json({ data, total: count })
}

export async function PATCH(req: NextRequest) {
  const { errorResponse } = await requireAuth()
  if (errorResponse) return errorResponse

  const body = await req.json()
  const { id, resolved } = body as { id: string; resolved: boolean }

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { error } = await supabase
    .from('error_logs')
    .update({ resolved })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
