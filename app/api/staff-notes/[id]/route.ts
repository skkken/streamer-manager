import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth-guard'
import { updateStaffNoteSchema, parseBody } from '@/lib/validations'

// PATCH /api/staff-notes/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse } = await requireAuth()
  if (errorResponse) return errorResponse

  const supabase = createServerClient()
  const { id } = await params

  const parsed = parseBody(updateStaffNoteSchema, await req.json())
  if (!parsed.success) return parsed.error

  const { data, error } = await supabase
    .from('staff_notes')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
