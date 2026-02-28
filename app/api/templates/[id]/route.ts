import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth-guard'
import { updateTemplateSchema, templateSchemaSchema, parseBody } from '@/lib/validations'
import { captureApiError } from '@/lib/error-logger'

type Params = { params: Promise<{ id: string }> }

// GET /api/templates/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const { errorResponse } = await requireAuth()
  if (errorResponse) return errorResponse

  const supabase = createServerClient()
  const { id } = await params
  const { data, error } = await supabase
    .from('self_check_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    captureApiError(error, '/api/templates/[id]', 'GET')
    return NextResponse.json({ error: 'テンプレートが見つかりません' }, { status: 404 })
  }
  return NextResponse.json(data)
}

// PATCH /api/templates/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  const { errorResponse: patchAuthErr } = await requireAuth()
  if (patchAuthErr) return patchAuthErr

  const supabase = createServerClient()
  const { id } = await params

  const parsed = parseBody(updateTemplateSchema, await req.json())
  if (!parsed.success) return parsed.error

  const { name, for_level, schema_json, is_active } = parsed.data

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (for_level !== undefined) updates.for_level = for_level
  if (is_active !== undefined) updates.is_active = is_active
  if (schema_json !== undefined) {
    let rawSchema: unknown
    try {
      rawSchema = JSON.parse(schema_json)
    } catch {
      return NextResponse.json({ error: 'JSON パース失敗' }, { status: 400 })
    }
    const schemaParsed = parseBody(templateSchemaSchema, rawSchema)
    if (!schemaParsed.success) return schemaParsed.error
    updates.schema = schemaParsed.data
  }

  const { data, error } = await supabase
    .from('self_check_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    captureApiError(error, '/api/templates/[id]', 'PATCH')
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
  return NextResponse.json(data)
}

// DELETE /api/templates/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { errorResponse: delAuthErr } = await requireAuth()
  if (delAuthErr) return delAuthErr

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
    captureApiError(error, '/api/templates/[id]', 'DELETE')
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
  return new NextResponse(null, { status: 204 })
}
