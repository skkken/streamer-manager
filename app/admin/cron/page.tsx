import AdminLayout from '@/components/layout/AdminLayout'
import { getCronSettings } from '@/lib/cron-settings'
import { requireAdminPage } from '@/lib/auth-guard'
import CronClient from './CronClient'

export const dynamic = 'force-dynamic'

export default async function CronPage() {
  await requireAdminPage()
  const settings = await getCronSettings()

  return (
    <AdminLayout title="Cron設定">
      <CronClient initial={settings} />
    </AdminLayout>
  )
}
