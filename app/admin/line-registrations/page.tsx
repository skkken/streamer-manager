import AdminLayout from '@/components/layout/AdminLayout'
import { createServerClient } from '@/lib/supabase/server'
import LineRegistrationsClient from './LineRegistrationsClient'

export const dynamic = 'force-dynamic'

export default async function LineRegistrationsPage() {
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
          公式LINEに友達追加してメッセージを送った配信者が表示されます。
          名前と TikTok ID を入力して配信者として登録してください。
        </p>
        <LineRegistrationsClient registrations={registrations ?? []} />
      </div>
    </AdminLayout>
  )
}
