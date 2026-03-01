export const revalidate = 60

import AdminLayout from '@/components/layout/AdminLayout'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/auth-guard'
import LineChannelsClient from './LineChannelsClient'

export default async function LineChannelsPage() {
  await requireAdminPage()
  const supabase = createServerClient()
  const { data: channels } = await supabase
    .from('line_channels')
    .select('id, name, channel_id, is_active, webhook_path, created_at, updated_at')
    .order('name')

  return (
    <AdminLayout title="LINEチャネル管理">
      <LineChannelsClient channels={channels ?? []} />
    </AdminLayout>
  )
}
