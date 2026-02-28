import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { TemplateSchema } from '@/lib/types'

type Params = { params: Promise<{ id: string }> }

// GET /api/templates/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = createServerClient()
  const { id } = await params
  const { data, error } = await supabase
    .from('self_check_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }
  return NextResponse.json(data)
}

// PATCH /api/templates/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  const supabase = createServerClient()
  const { id } = await params
  const body = await req.json()
  const { name, for_level, schema_json } = body

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (for_level !== undefined) updates.for_level = for_level
  if (schema_json !== undefined) {
    let schema: TemplateSchema
    try {
      schema = JSON.parse(schema_json)
    } catch {
      return NextResponse.json({ error: 'JSON パース失敗' }, { status: 400 })
    }
    updates.schema = schema
  }

  const { data, error } = await supabase
    .from('self_check_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

// DELETE /api/templates/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const supabase = createServerClient()
  const { id } = await params

  // アクティブなテンプレートは削除不可
  const { data: tmpl } = await supabase
    .from('self_check_templates')
    .select('is_active')
    .eq('id', id)
    .single()

  if (tmpl?.is_active) {
    return NextResponse.json(
      { error: 'アクティブなテンプレートは削除できません。先に別のテンプレートをアクティブにしてください。' },
      { status: 409 }
    )
  }

  const { error } = await supabase
    .from('self_check_templates')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return new NextResponse(null, { status: 204 })
}
