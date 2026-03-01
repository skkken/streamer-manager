export const revalidate = 60

import AdminLayout from '@/components/layout/AdminLayout'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/auth-guard'
import UsersClient from './UsersClient'

export default async function UsersPage() {
  await requireAdminPage()
  const supabase = createServerClient()

  const [usersRes, rolesRes, permsRes, channelsRes] = await Promise.all([
    supabase.auth.admin.listUsers(),
    supabase.from('user_roles').select('user_id, role'),
    supabase.from('user_channel_permissions').select('user_id, channel_id'),
    supabase.from('line_channels').select('id, name').eq('is_active', true).order('name'),
  ])

  const channelMap = new Map<string, string>()
  for (const ch of channelsRes.data ?? []) {
    channelMap.set(ch.id, ch.name)
  }

  const roleMap = new Map<string, string>()
  for (const r of rolesRes.data ?? []) {
    roleMap.set(r.user_id, r.role)
  }

  const permMap = new Map<string, { id: string; name: string }[]>()
  for (const p of permsRes.data ?? []) {
    const list = permMap.get(p.user_id) ?? []
    list.push({ id: p.channel_id, name: channelMap.get(p.channel_id) ?? '' })
    permMap.set(p.user_id, list)
  }

  const users = (usersRes.data?.users ?? []).map(u => ({
    id: u.id,
    email: u.email ?? '',
    role: roleMap.get(u.id) ?? 'staff',
    channels: permMap.get(u.id) ?? [],
    created_at: u.created_at,
  }))

  const allChannels = (channelsRes.data ?? []).map(ch => ({
    id: ch.id,
    name: ch.name,
  }))

  return (
    <AdminLayout title="ユーザー管理">
      <UsersClient users={users} allChannels={allChannels} />
    </AdminLayout>
  )
}
