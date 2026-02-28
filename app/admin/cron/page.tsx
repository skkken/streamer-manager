import AdminLayout from '@/components/layout/AdminLayout'
import { getCronSettings } from '@/lib/cron-settings'
import CronClient from './CronClient'

export const dynamic = 'force-dynamic'

export default async function CronPage() {
  const settings = await getCronSettings()

  return (
    <AdminLayout title="Cron設定">
      <CronClient initial={settings} />
    </AdminLayout>
  )
}
