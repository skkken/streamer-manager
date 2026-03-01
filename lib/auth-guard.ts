import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { createAuthServerClient } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types'

export async function requireAuth() {
  const supabase = await createAuthServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
    }
  }

  return { user, errorResponse: null }
}

export async function requireAdminAuth() {
  const authResult = await requireAuth()
  if (authResult.errorResponse) return authResult

  const supabase = createServerClient()
  const { data: role } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', authResult.user!.id)
    .single()

  if (role?.role !== 'admin') {
    return {
      user: authResult.user,
      errorResponse: NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      ),
    }
  }

  return { user: authResult.user, errorResponse: null }
}

/**
 * Server Component 用: admin でなければ /streamers にリダイレクト
 */
export async function requireAdminPage() {
  const supabase = await createAuthServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const db = createServerClient()
  const { data: role } = await db
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (role?.role !== 'admin') {
    redirect('/streamers')
  }
}

/**
 * API 用: ユーザーの閲覧可能チャネルIDを取得
 * admin → null（全チャネル）
 * staff → string[]（許可チャネルID配列）
 */
export async function getUserChannelIds(userId: string): Promise<string[] | null> {
  const supabase = createServerClient()
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single()

  const role = (roleData?.role as UserRole) ?? 'staff'
  if (role === 'admin') return null

  const { data: perms } = await supabase
    .from('user_channel_permissions')
    .select('channel_id')
    .eq('user_id', userId)

  return (perms ?? []).map(p => p.channel_id)
}

/**
 * Server Component 用: ユーザーのロールとチャネル権限を取得
 * 未認証 → /login にリダイレクト
 */
export async function getPagePermissions(): Promise<{
  user: { id: string; email?: string }
  role: UserRole
  channelIds: string[] | null
}> {
  const supabase = await createAuthServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const channelIds = await getUserChannelIds(user.id)
  const role: UserRole = channelIds === null ? 'admin' : 'staff'

  return { user, role, channelIds }
}
