export const dynamic = 'force-dynamic'

import AdminLayout from '@/components/layout/AdminLayout'
import EditTemplateForm from './EditTemplateForm'

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <AdminLayout title="テンプレ 編集">
      <EditTemplateForm id={id} />
    </AdminLayout>
  )
}
