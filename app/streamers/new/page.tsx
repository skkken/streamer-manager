import AdminLayout from '@/components/layout/AdminLayout'
import { requireAdminPage } from '@/lib/auth-guard'
import NewStreamerForm from './NewStreamerForm'

export default async function NewStreamerPage() {
  await requireAdminPage()

  return (
    <AdminLayout title="配信者 新規作成">
      <NewStreamerForm />
    </AdminLayout>
  )
}
