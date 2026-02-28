import AdminLayout from '@/components/layout/AdminLayout'
import NewTemplateForm from './NewTemplateForm'

export default async function NewTemplatePage() {
  return (
    <AdminLayout title="テンプレ 新規作成">
      <NewTemplateForm />
    </AdminLayout>
  )
}
