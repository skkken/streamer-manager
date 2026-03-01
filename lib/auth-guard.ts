import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { createAuthServerClient } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

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
