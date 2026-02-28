import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth-guard'
import { createTemplateSchema, templateSchemaSchema, parseBody } from '@/lib/validations'
import { captureApiError } from '@/lib/error-logger'

export async function GET() {
  const { errorResponse } = await requireAuth()
  if (errorResponse) return errorResponse

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('self_check_templates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    captureApiError(error, '/api/templates', 'GET')
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { errorResponse: postAuthErr } = await requireAuth()
  if (postAuthErr) return postAuthErr

  const supabase = createServerClient()

  const parsed = parseBody(createTemplateSchema, await req.json())
  if (!parsed.success) return parsed.error

  const { name, for_level, schema_json } = parsed.data

  let schema: unknown
  try {
    schema = JSON.parse(schema_json)
  } catch {
    return NextResponse.json({ error: 'JSON パース失敗' }, { status: 400 })
  }

  const schemaParsed = parseBody(templateSchemaSchema, schema)
  if (!schemaParsed.success) return schemaParsed.error

  const { data, error } = await supabase
    .from('self_check_templates')
    .insert({ name, for_level: for_level ?? 1, schema: schemaParsed.data })
    .select()
    .single()

  if (error) {
    captureApiError(error, '/api/templates', 'POST')
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
