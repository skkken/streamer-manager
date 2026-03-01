import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdminAuth } from '@/lib/auth-guard'
import { updateUserSchema, parseRequest } from '@/lib/validations'
import { captureApiError } from '@/lib/error-logger'

// PATCH /api/admin/users/[id] — ロール・チャネル権限更新
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAuth()
  if (authResult.errorResponse) return authResult.errorResponse

  const { id } = await params
  const parsed = await parseRequest(updateUserSchema, req)
  if (!parsed.success) return parsed.error

  const { role, channel_ids } = parsed.data

  // 自分自身のロール変更は禁止
  if (role && authResult.user!.id === id) {
    return NextResponse.json({ error: '自分自身のロールは変更できません' }, { status: 400 })
  }

  try {
    const supabase = createServerClient()

    // ロール更新
    if (role) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({ user_id: id, role }, { onConflict: 'user_id' })

      if (roleError) {
        captureApiError(roleError, `/api/admin/users/${id}`, 'PATCH')
        return NextResponse.json({ error: 'ロールの更新に失敗しました' }, { status: 500 })
      }
    }

    // チャネル権限更新（全置換方式）
    if (channel_ids !== undefined) {
      // 既存権限を削除
      const { error: deleteError } = await supabase
        .from('user_channel_permissions')
        .delete()
        .eq('user_id', id)

      if (deleteError) {
        captureApiError(deleteError, `/api/admin/users/${id}`, 'PATCH', { step: 'delete_permissions' })
        return NextResponse.json({ error: '権限の更新に失敗しました' }, { status: 500 })
      }

      // 新しい権限を挿入
      if (channel_ids.length > 0) {
        const rows = channel_ids.map(channel_id => ({ user_id: id, channel_id }))
        const { error: insertError } = await supabase
          .from('user_channel_permissions')
          .insert(rows)

        if (insertError) {
          captureApiError(insertError, `/api/admin/users/${id}`, 'PATCH', { step: 'insert_permissions' })
          return NextResponse.json({ error: '権限の更新に失敗しました' }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    captureApiError(e, `/api/admin/users/${id}`, 'PATCH')
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

// DELETE /api/admin/users/[id] — ユーザー削除
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAuth()
  if (authResult.errorResponse) return authResult.errorResponse

  const { id } = await params

  // 自分自身の削除は禁止
  if (authResult.user!.id === id) {
    return NextResponse.json({ error: '自分自身は削除できません' }, { status: 400 })
  }

  try {
    const supabase = createServerClient()

    const { error } = await supabase.auth.admin.deleteUser(id)
    if (error) {
      captureApiError(error, `/api/admin/users/${id}`, 'DELETE')
      return NextResponse.json({ error: 'ユーザーの削除に失敗しました' }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (e) {
    captureApiError(e, `/api/admin/users/${id}`, 'DELETE')
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
