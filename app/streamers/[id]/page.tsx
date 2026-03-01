export const dynamic = 'force-dynamic'

import AdminLayout from '@/components/layout/AdminLayout'
import { createServerClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import StreamerDetailClient from './StreamerDetailClient'
import { SelfCheck, TemplateField, TemplateSchema } from '@/lib/types'
import { getJstDateString, getJstNow } from '@/lib/jst'
import { getPagePermissions } from '@/lib/auth-guard'

function yesRatio(answers: Record<string, boolean | string>): number {
  const vals = Object.values(answers).filter((v) => typeof v === 'boolean')
  if (!vals.length) return 0
  return vals.filter((v) => v === true).length / vals.length
}

function computeStats(
  checks: SelfCheck[],
  totalDiamonds: number,
  earnings: { date: string; diamonds: number; streaming_minutes: number }[]
) {
  const todayStr = getJstDateString()
  const monthKey = todayStr.slice(0, 7)

  // 今月ダイヤ
  const monthDiamonds = earnings
    .filter((r) => r.date.startsWith(monthKey))
    .reduce((sum, r) => sum + (r.diamonds ?? 0), 0)

  // 今週の月曜日を計算（月=1, 日=7）（JST営業日基準）
  const jstNow = getJstNow()
  const dayOfWeek = jstNow.getUTCDay() === 0 ? 7 : jstNow.getUTCDay()
  const weekDenominator = dayOfWeek
  const monday = new Date(jstNow)
  monday.setUTCDate(jstNow.getUTCDate() - (dayOfWeek - 1))
  const mondayStr = getJstDateString(monday)

  // チェックイン回答率: 今週（月〜今日）
  const weekChecks = checks.filter((c) => c.date >= mondayStr && c.date <= todayStr)
  const checkinRate = weekChecks.length / weekDenominator

  // 直近チェックインのYES割合（最新1件）
  const latestYes = checks.length > 0 ? yesRatio(checks[0].answers) : null

  // 今週のYES割合
  const weekYes =
    weekChecks.length > 0
      ? weekChecks.reduce((sum, c) => sum + yesRatio(c.answers), 0) / weekChecks.length
      : null

  // 配信時間集計
  const weekStreamingMinutes = earnings
    .filter((r) => r.date >= mondayStr && r.date <= todayStr)
    .reduce((sum, r) => sum + (r.streaming_minutes ?? 0), 0)
  const monthStreamingMinutes = earnings
    .filter((r) => r.date.startsWith(monthKey))
    .reduce((sum, r) => sum + (r.streaming_minutes ?? 0), 0)
  const totalStreamingMinutes = earnings.reduce((sum, r) => sum + (r.streaming_minutes ?? 0), 0)

  return { totalDiamonds, monthDiamonds, checkinRate, latestYes, weekYes, weekStreamingMinutes, monthStreamingMinutes, totalStreamingMinutes }
}

async function getData(id: string) {
  try {
    const supabase = createServerClient()
    const [streamerRes, checksRes, notesRes, earningsRes, templatesRes, channelsRes] = await Promise.all([
      supabase.from('streamers').select('*').eq('id', id).single(),
      supabase
        .from('self_checks')
        .select('*')
        .eq('streamer_id', id)
        .order('date', { ascending: false })
        .limit(60),
      supabase
        .from('staff_notes')
        .select('*')
        .eq('streamer_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('daily_earnings')
        .select('date, diamonds, streaming_minutes')
        .eq('streamer_id', id),
      supabase.from('self_check_templates').select('id, schema'),
      supabase.from('line_channels').select('id, name'),
    ])
    const earnings = earningsRes.data ?? []
    const totalDiamonds = earnings.reduce((sum, r) => sum + (r.diamonds ?? 0), 0)

    // 日付 → earnings のマップ
    const earningsByDate: Record<string, { diamonds: number; streaming_minutes: number }> = {}
    for (const e of earnings) {
      earningsByDate[e.date] = { diamonds: e.diamonds ?? 0, streaming_minutes: e.streaming_minutes ?? 0 }
    }

    const templateFields: Record<string, TemplateField[]> = {}
    for (const t of templatesRes.data ?? []) {
      templateFields[t.id] = ((t.schema as TemplateSchema) ?? {}).fields ?? []
    }

    // チャネル名を取得（並列取得済みのデータからマップ参照）
    const channelNameMap = new Map((channelsRes.data ?? []).map((ch) => [ch.id, ch.name]))
    const channelName = streamerRes.data?.line_channel_id
      ? channelNameMap.get(streamerRes.data.line_channel_id) ?? null
      : null

    return {
      streamer: streamerRes.data,
      checks: checksRes.data ?? [],
      notes: notesRes.data ?? [],
      stats: computeStats(checksRes.data ?? [], totalDiamonds, earnings),
      templateFields,
      earningsByDate,
      channelName,
    }
  } catch {
    return { streamer: null, checks: [], notes: [], stats: null, templateFields: {}, earningsByDate: {}, channelName: null }
  }
}

export default async function StreamerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { channelIds } = await getPagePermissions()
  const { streamer, checks, notes, stats, templateFields, earningsByDate, channelName } = await getData(id)

  if (!streamer) {
    notFound()
  }

  // チャネル権限チェック: staff が権限外の配信者にアクセスした場合はリダイレクト
  if (channelIds !== null && streamer.line_channel_id && !channelIds.includes(streamer.line_channel_id)) {
    redirect('/streamers')
  }

  return (
    <AdminLayout title="配信者詳細">
      <StreamerDetailClient streamer={streamer} checks={checks} notes={notes} stats={stats} templateFields={templateFields} earningsByDate={earningsByDate} channelName={channelName} />
    </AdminLayout>
  )
}
