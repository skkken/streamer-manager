export const revalidate = 60

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

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date: queryDate } = await searchParams
  const today = getJstDateString()
  const targetDate =
    queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate) ? queryDate : today
  const streamers = await getActiveStreamersWithCheckStatus(targetDate)

  return (
    <AdminLayout title="通知ジョブ">
      <NotificationsClient today={today} targetDate={targetDate} streamers={streamers} />
    </AdminLayout>
  )
}
