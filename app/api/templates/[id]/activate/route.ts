import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

// POST /api/templates/[id]/activate — テンプレをアクティブ化
export async function POST(_req: NextRequest, { params }: Params) {
  const supabase = createServerClient()
  const { id } = await params

  // トリガーで他を非アクティブ化してくれる
  const { data, error } = await supabase
    .from('self_check_templates')
    .update({ is_active: true })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
