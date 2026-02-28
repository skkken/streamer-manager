import AdminLayout from '@/components/layout/AdminLayout'
import { createServerClient } from '@/lib/supabase/server'
import { getJstDateString } from '@/lib/jst'
import NotificationsClient from './NotificationsClient'

async function getActiveStreamersWithCheckStatus(date: string) {
  try {
    const supabase = createServerClient()

    // アクティブな配信者を取得
    const { data: streamers } = await supabase
      .from('streamers')
      .select('id, display_name, line_user_id, status')
      .eq('status', 'active')
      .order('display_name')

    if (!streamers?.length) return []

    // 今日のセルフチェック提出済みの配信者IDを取得
    const { data: checks } = await supabase
      .from('self_checks')
      .select('streamer_id')
      .eq('date', date)

    const submittedIds = new Set((checks ?? []).map((c) => c.streamer_id))

    return streamers.map((s) => ({
      ...s,
      submitted: submittedIds.has(s.id),
      has_line: !!s.line_user_id,
    }))
  } catch {
    return []
  }
}

export default async function NotificationsPage() {
  const today = getJstDateString()
  const streamers = await getActiveStreamersWithCheckStatus(today)

  return (
    <AdminLayout title="通知ジョブ">
      <NotificationsClient today={today} streamers={streamers} />
    </AdminLayout>
  )
}
