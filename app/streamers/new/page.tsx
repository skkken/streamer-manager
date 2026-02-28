import AdminLayout from '@/components/layout/AdminLayout'
import NewStreamerForm from './NewStreamerForm'

export default async function NewStreamerPage() {
  return (
    <AdminLayout title="配信者 新規作成">
      <NewStreamerForm />
    </AdminLayout>
  )
}
