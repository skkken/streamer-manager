import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth-guard'
import { updateStreamerSchema, parseBody } from '@/lib/validations'

type Params = { params: Promise<{ id: string }> }

// GET /api/streamers/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const { errorResponse } = await requireAuth()
  if (errorResponse) return errorResponse

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
  const { errorResponse: patchAuthErr } = await requireAuth()
  if (patchAuthErr) return patchAuthErr

  const supabase = createServerClient()
  const { id } = await params

  const parsed = parseBody(updateStreamerSchema, await req.json())
  if (!parsed.success) return parsed.error

  const { data, error } = await supabase
    .from('streamers')
    .update(parsed.data)
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
  const { errorResponse: delAuthErr } = await requireAuth()
  if (delAuthErr) return delAuthErr

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
