import AdminLayout from '@/components/layout/AdminLayout'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/auth-guard'
import LineRegistrationsClient from './LineRegistrationsClient'

export const dynamic = 'force-dynamic'

export default async function LineRegistrationsPage() {
  await requireAdminPage()
  const supabase = createServerClient()

  const { data: registrations } = await supabase
    .from('line_registrations')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  return (
    <AdminLayout title="LINE 登録待ち">
      <div className="max-w-2xl">
        <p className="text-sm text-gray-500 mb-4">
          公式LINEに友達追加した配信者が表示されます。
          入力完了になったら内容を確認して配信者として登録してください。
        </p>
        <LineRegistrationsClient registrations={registrations ?? []} />
      </div>
    </AdminLayout>
  )
}
