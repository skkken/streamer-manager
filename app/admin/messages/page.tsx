export const dynamic = 'force-dynamic'

import AdminLayout from '@/components/layout/AdminLayout'
import { getMessageSettings } from '@/lib/messages'
import MessagesClient from './MessagesClient'

export default async function MessagesPage() {
  const settings = await getMessageSettings()

  return (
    <AdminLayout title="メッセージ設定">
      <MessagesClient initial={settings} />
    </AdminLayout>
  )
}
