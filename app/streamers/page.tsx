export const revalidate = 30

import AdminLayout from '@/components/layout/AdminLayout'
import Card from '@/components/ui/Card'
import { createServerClient } from '@/lib/supabase/server'
import { Streamer, StaffNoteStatus } from '@/lib/types'
import StreamersTable, { StreamerRow } from './StreamersTable'
import { getJstDateString, getJstNow } from '@/lib/jst'
import { getPagePermissions } from '@/lib/auth-guard'



function yesRatio(answers: Record<string, boolean | string>): number {
  const vals = Object.values(answers).filter((v) => typeof v === 'boolean')
  if (!vals.length) return 0
  return vals.filter((v) => v === true).length / vals.length
}

async function getData(channelIds: string[] | null): Promise<StreamerRow[]> {
  try {
    const supabase = createServerClient()

    const todayStr = getJstDateString()
    const monthKey = todayStr.slice(0, 7)

    // 今週の月曜日を計算（月=1, 日=7）（JST営業日基準）
    const jstNow = getJstNow()
    const dayOfWeek = jstNow.getUTCDay() === 0 ? 7 : jstNow.getUTCDay()
    const weekDenominator = dayOfWeek
    const monday = new Date(jstNow)
    monday.setUTCDate(jstNow.getUTCDate() - (dayOfWeek - 1))
    const mondayStr = getJstDateString(monday)

    const monthStart = monthKey + '-01'

    let streamersQuery = supabase.from('streamers').select('*').order('created_at', { ascending: false })
    if (channelIds !== null) {
      if (channelIds.length === 0) return []
      streamersQuery = streamersQuery.in('line_channel_id', channelIds)
    }

    const [streamersRes, earningsSummaryRes, checksRes, notesRes, channelsRes] = await Promise.all([
      streamersQuery,
      supabase.rpc('get_earnings_summary', { month_start: monthStart }),
      supabase
        .from('self_checks')
        .select('streamer_id, date, answers')
        .gte('date', mondayStr)
        .lte('date', todayStr),
      supabase
        .from('staff_notes')
        .select('streamer_id, status, date')
        .order('date', { ascending: false }),
      supabase.from('line_channels').select('id, name'),
    ])

    const streamers: Streamer[] = streamersRes.data ?? []

    // チャネル名マップ
    const channelNameMap = new Map<string, string>()
    for (const ch of channelsRes.data ?? []) {
      channelNameMap.set(ch.id, ch.name)
    }

    // ダイヤ・配信時間集計マップ（DB側で SUM/GROUP BY 済み）
    type EarningsSummary = { streamer_id: string; total_diamonds: number; month_diamonds: number; total_streaming_minutes: number; month_streaming_minutes: number }
    const earningsMap = new Map<string, EarningsSummary>()
    for (const r of (earningsSummaryRes.data ?? []) as EarningsSummary[]) {
      earningsMap.set(r.streamer_id, r)
    }

    // 最新スタッフノートステータス（streamer_idごとに最初の1件 = 最新）
    const latestNoteStatusMap = new Map<string, StaffNoteStatus>()
    for (const n of notesRes.data ?? []) {
      if (!latestNoteStatusMap.has(n.streamer_id)) {
        latestNoteStatusMap.set(n.streamer_id, n.status as StaffNoteStatus)
      }
    }

    // チェックイン回答率・今週YES割合集計
    const weekCheckinCountMap = new Map<string, number>()
    const weekYesSumMap = new Map<string, number>()
    const weekYesCountMap = new Map<string, number>()
    for (const c of checksRes.data ?? []) {
      weekCheckinCountMap.set(c.streamer_id, (weekCheckinCountMap.get(c.streamer_id) ?? 0) + 1)
      const ratio = yesRatio(c.answers as Record<string, boolean | string>)
      weekYesSumMap.set(c.streamer_id, (weekYesSumMap.get(c.streamer_id) ?? 0) + ratio)
      weekYesCountMap.set(c.streamer_id, (weekYesCountMap.get(c.streamer_id) ?? 0) + 1)
    }

    return streamers.map((s) => {
      const cnt = weekCheckinCountMap.get(s.id) ?? 0
      const weekCnt = weekYesCountMap.get(s.id) ?? 0
      const earn = earningsMap.get(s.id)
      return {
        ...s,
        totalDiamonds: earn?.total_diamonds ?? 0,
        monthDiamonds: earn?.month_diamonds ?? 0,
        totalStreamingMinutes: earn?.total_streaming_minutes ?? 0,
        monthStreamingMinutes: earn?.month_streaming_minutes ?? 0,
        checkinRate: cnt / weekDenominator,
        weekYes: weekCnt > 0 ? (weekYesSumMap.get(s.id) ?? 0) / weekCnt : null,
        latestNoteStatus: latestNoteStatusMap.get(s.id) ?? null,
        channelName: s.line_channel_id ? channelNameMap.get(s.line_channel_id) ?? null : null,
      }
    })
  } catch {
    return []
  }
}

export default async function StreamersPage() {
  const { channelIds } = await getPagePermissions()
  const streamers = await getData(channelIds)

  return (
    <AdminLayout title="配信者一覧">
      <div className="mb-4">
        <p className="text-sm text-gray-500">{streamers.length} 件</p>
      </div>

      {streamers.length === 0 ? (
        <Card>
          <div className="px-6 py-12 text-center">
            <p className="text-gray-400 text-sm">まだ配信者が登録されていません</p>
          </div>
        </Card>
      ) : (
        <StreamersTable streamers={streamers} />
      )}
    </AdminLayout>
  )
}
