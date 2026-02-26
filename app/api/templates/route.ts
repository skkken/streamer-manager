import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { TemplateSchema } from '@/lib/types'

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('self_check_templates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const body = await req.json()

  const { name, version, schema_json } = body

  if (!name || !schema_json) {
    return NextResponse.json({ error: 'name と schema_json は必須' }, { status: 400 })
  }

  let schema: TemplateSchema
  try {
    schema = JSON.parse(schema_json)
  } catch {
    return NextResponse.json({ error: 'JSON パース失敗' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('self_check_templates')
    .insert({ name, version: version ?? '1.0', schema })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
