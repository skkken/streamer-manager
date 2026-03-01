import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdminAuth } from '@/lib/auth-guard'
import { inviteUserSchema, parseRequest } from '@/lib/validations'
import { captureApiError } from '@/lib/error-logger'

// GET /api/admin/users — ユーザー一覧
export async function GET() {
  const { errorResponse } = await requireAdminAuth()
  if (errorResponse) return errorResponse

  try {
    const supabase = createServerClient()

    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
    if (usersError) {
      captureApiError(usersError, '/api/admin/users', 'GET')
      return NextResponse.json({ error: 'ユーザー一覧の取得に失敗しました' }, { status: 500 })
    }

    const { data: roles } = await supabase.from('user_roles').select('user_id, role')
    const { data: permissions } = await supabase
      .from('user_channel_permissions')
      .select('user_id, channel_id')

    const { data: channels } = await supabase
      .from('line_channels')
      .select('id, name')

    const channelMap = new Map<string, string>()
    for (const ch of channels ?? []) {
      channelMap.set(ch.id, ch.name)
    }

    const roleMap = new Map<string, string>()
    for (const r of roles ?? []) {
      roleMap.set(r.user_id, r.role)
    }

    const permMap = new Map<string, { id: string; name: string }[]>()
    for (const p of permissions ?? []) {
      const list = permMap.get(p.user_id) ?? []
      list.push({ id: p.channel_id, name: channelMap.get(p.channel_id) ?? '' })
      permMap.set(p.user_id, list)
    }

    const result = (users ?? []).map(u => ({
      id: u.id,
      email: u.email ?? '',
      role: roleMap.get(u.id) ?? 'staff',
      channels: permMap.get(u.id) ?? [],
      created_at: u.created_at,
    }))

    return NextResponse.json(result)
  } catch (e) {
    captureApiError(e, '/api/admin/users', 'GET')
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

// POST /api/admin/users — ユーザー招待
export async function POST(req: Request) {
  const { errorResponse } = await requireAdminAuth()
  if (errorResponse) return errorResponse

  const parsed = await parseRequest(inviteUserSchema, req)
  if (!parsed.success) return parsed.error

  const { email, role, channel_ids } = parsed.data

  try {
    const supabase = createServerClient()

    // 招待メール送信（ユーザー作成 + メール送信を一括で行う）
    const { data: userData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        data: { needs_password_setup: true },
      }
    )

    if (inviteError) {
      if (inviteError.message?.includes('already been registered')) {
        return NextResponse.json({ error: 'このメールアドレスは既に登録されています' }, { status: 409 })
      }
      captureApiError(inviteError, '/api/admin/users', 'POST')
      return NextResponse.json({ error: '招待メールの送信に失敗しました' }, { status: 500 })
    }

    const userId = userData.user.id

    // ロール挿入
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role })

    if (roleError) {
      captureApiError(roleError, '/api/admin/users', 'POST', { step: 'insert_role' })
    }

    // チャネル権限挿入
    if (channel_ids.length > 0) {
      const rows = channel_ids.map(channel_id => ({ user_id: userId, channel_id }))
      const { error: permError } = await supabase
        .from('user_channel_permissions')
        .insert(rows)

      if (permError) {
        captureApiError(permError, '/api/admin/users', 'POST', { step: 'insert_permissions' })
      }
    }

    return NextResponse.json({ id: userId, email, role }, { status: 201 })
  } catch (e) {
    captureApiError(e, '/api/admin/users', 'POST')
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
