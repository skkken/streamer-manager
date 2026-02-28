export const dynamic = 'force-dynamic'

import AdminLayout from '@/components/layout/AdminLayout'
import EditForm from './EditForm'

export default async function StreamerEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <AdminLayout title="配信者 編集">
      <EditForm id={id} />
    </AdminLayout>
  )
}
