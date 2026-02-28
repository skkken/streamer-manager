import AdminLayout from '@/components/layout/AdminLayout'
import ErrorLogsClient from './ErrorLogsClient'

export default function ErrorLogsPage() {
  return (
    <AdminLayout title="エラーログ">
      <ErrorLogsClient />
    </AdminLayout>
  )
}
