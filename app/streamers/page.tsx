export const dynamic = 'force-dynamic'

import AdminLayout from '@/components/layout/AdminLayout'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { createServerClient } from '@/lib/supabase/server'
import { Streamer, StaffNoteStatus } from '@/lib/types'
import StreamersTable, { StreamerRow } from './StreamersTable'
import { getJstDateString, getJstNow } from '@/lib/jst'



function yesRatio(answers: Record<string, boolean | string>): number {
  const vals = Object.values(answers).filter((v) => typeof v === 'boolean')
  if (!vals.length) return 0
  return vals.filter((v) => v === true).length / vals.length
}

async function getData(): Promise<StreamerRow[]> {
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

    const [streamersRes, earningsRes, checksRes, notesRes, channelsRes] = await Promise.all([
      supabase.from('streamers').select('*').order('created_at', { ascending: false }),
      supabase.from('daily_earnings').select('streamer_id, date, diamonds, streaming_minutes'),
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

    // ダイヤ・配信時間集計（累計 & 今月）
    const totalDiamondMap = new Map<string, number>()
    const monthDiamondMap = new Map<string, number>()
    const totalStreamingMap = new Map<string, number>()
    const monthStreamingMap = new Map<string, number>()
    for (const r of earningsRes.data ?? []) {
      totalDiamondMap.set(r.streamer_id, (totalDiamondMap.get(r.streamer_id) ?? 0) + (r.diamonds ?? 0))
      totalStreamingMap.set(r.streamer_id, (totalStreamingMap.get(r.streamer_id) ?? 0) + (r.streaming_minutes ?? 0))
      if (r.date.startsWith(monthKey)) {
        monthDiamondMap.set(r.streamer_id, (monthDiamondMap.get(r.streamer_id) ?? 0) + (r.diamonds ?? 0))
        monthStreamingMap.set(r.streamer_id, (monthStreamingMap.get(r.streamer_id) ?? 0) + (r.streaming_minutes ?? 0))
      }
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
      return {
        ...s,
        totalDiamonds: totalDiamondMap.get(s.id) ?? 0,
        monthDiamonds: monthDiamondMap.get(s.id) ?? 0,
        totalStreamingMinutes: totalStreamingMap.get(s.id) ?? 0,
        monthStreamingMinutes: monthStreamingMap.get(s.id) ?? 0,
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
  const streamers = await getData()

  return (
    <AdminLayout title="配信者一覧">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{streamers.length} 件</p>
        <Link href="/streamers/new">
          <Button size="sm">+ 新規作成</Button>
        </Link>
      </div>

      {streamers.length === 0 ? (
        <Card>
          <div className="px-6 py-12 text-center">
            <p className="text-gray-400 text-sm">まだ配信者が登録されていません</p>
            <Link href="/streamers/new">
              <Button size="sm" className="mt-4">+ 最初の配信者を追加</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <StreamersTable streamers={streamers} />
      )}
    </AdminLayout>
  )
}
