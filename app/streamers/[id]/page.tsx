import AdminLayout from '@/components/layout/AdminLayout'
import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import StreamerDetailClient from './StreamerDetailClient'
import { SelfCheck, TemplateField, TemplateSchema } from '@/lib/types'

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
  const today = new Date()
  const monthKey = today.toISOString().slice(0, 7)
  const todayStr = today.toISOString().slice(0, 10)

  // 今月ダイヤ
  const monthDiamonds = earnings
    .filter((r) => r.date.startsWith(monthKey))
    .reduce((sum, r) => sum + (r.diamonds ?? 0), 0)

  // 今週の月曜日を計算（月=1, 日=7）
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay()
  const weekDenominator = dayOfWeek
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dayOfWeek - 1))
  const mondayStr = monday.toISOString().slice(0, 10)

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
    const [streamerRes, checksRes, notesRes, earningsRes, templatesRes] = await Promise.all([
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
    ])
    const earnings = earningsRes.data ?? []
    const totalDiamonds = earnings.reduce((sum, r) => sum + (r.diamonds ?? 0), 0)

    const templateFields: Record<string, TemplateField[]> = {}
    for (const t of templatesRes.data ?? []) {
      templateFields[t.id] = ((t.schema as TemplateSchema) ?? {}).fields ?? []
    }

    return {
      streamer: streamerRes.data,
      checks: checksRes.data ?? [],
      notes: notesRes.data ?? [],
      stats: computeStats(checksRes.data ?? [], totalDiamonds, earnings),
      templateFields,
    }
  } catch {
    return { streamer: null, checks: [], notes: [], stats: null, templateFields: {} }
  }
}

export default async function StreamerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { streamer, checks, notes, stats, templateFields } = await getData(id)

  if (!streamer) {
    notFound()
  }

  return (
    <AdminLayout title="配信者詳細">
      <StreamerDetailClient streamer={streamer} checks={checks} notes={notes} stats={stats} templateFields={templateFields} />
    </AdminLayout>
  )
}
