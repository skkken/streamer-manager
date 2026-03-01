export const revalidate = 30

import AdminLayout from '@/components/layout/AdminLayout'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import Card, { CardHeader } from '@/components/ui/Card'
import { createServerClient } from '@/lib/supabase/server'
import { getJstDateString } from '@/lib/jst'
import { BoardItem, BoardPriority } from '@/lib/types'
import { detectNegativeInText } from '@/lib/ai'

const priorityLabel: Record<BoardPriority, string> = {
  danger: '危険',
  warning: '要注意',
  normal: '通常',
}

const priorityVariant: Record<BoardPriority, 'red' | 'yellow' | 'gray'> = {
  danger: 'red',
  warning: 'yellow',
  normal: 'gray',
}

async function getBoardItems(): Promise<BoardItem[]> {
  try {
    const supabase = createServerClient()
    const today = getJstDateString()

    const dates: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.now() + 9 * 3600000 - i * 86400000)
      const y = d.getUTCFullYear()
      const m = String(d.getUTCMonth() + 1).padStart(2, '0')
      const day = String(d.getUTCDate()).padStart(2, '0')
      dates.push(`${y}-${m}-${day}`)
    }

    const { data: streamers } = await supabase
      .from('streamers')
      .select('*')
      .eq('status', 'active')
      .order('display_name')

    if (!streamers?.length) return []

    const { data: checks } = await supabase
      .from('self_checks')
      .select('*')
      .in('streamer_id', streamers.map((s) => s.id))
      .in('date', dates)

    const checksByStreamer = new Map<string, typeof checks>()
    for (const check of checks ?? []) {
      if (!checksByStreamer.has(check.streamer_id)) {
        checksByStreamer.set(check.streamer_id, [])
      }
      checksByStreamer.get(check.streamer_id)!.push(check)
    }

    const items: BoardItem[] = streamers.map((streamer) => {
      const myChecks = (checksByStreamer.get(streamer.id) ?? []).sort(
        (a, b) => b.date.localeCompare(a.date)
      )
      const todayCheck = myChecks.find((c) => c.date === today) ?? null

      let consecutiveMissing = 0
      for (const date of dates) {
        if (!myChecks.some((c) => c.date === date)) consecutiveMissing++
        else break
      }

      const scoredChecks = myChecks.filter((c) => c.overall_score !== null)
      let scoreDrop = false
      if (scoredChecks.length >= 2 && todayCheck?.overall_score != null) {
        const avg = scoredChecks.reduce((s, c) => s + (c.overall_score ?? 0), 0) / scoredChecks.length
        if (avg - todayCheck.overall_score >= 20) scoreDrop = true
      }

      let negativeDetected = false
      if (todayCheck) {
        if (todayCheck.ai_negative_detected) negativeDetected = true
        if (detectNegativeInText(todayCheck.memo)) negativeDetected = true
        if (todayCheck.answers) {
          const texts = Object.values(todayCheck.answers).filter((v) => typeof v === 'string') as string[]
          if (detectNegativeInText(texts.join(' '))) negativeDetected = true
        }
      }

      let priority: BoardPriority = 'normal'
      if (consecutiveMissing >= 3 || (negativeDetected && consecutiveMissing >= 1)) priority = 'danger'
      else if (consecutiveMissing === 2 || scoreDrop || negativeDetected) priority = 'warning'

      return { streamer, priority, consecutiveMissing, scoreDrop, negativeDetected, latestCheck: todayCheck }
    })

    const order: Record<BoardPriority, number> = { danger: 0, warning: 1, normal: 2 }
    return items.sort((a, b) => order[a.priority] - order[b.priority])
  } catch {
    return []
  }
}

export default async function BoardPage() {
  const items = await getBoardItems()
  const danger = items.filter((i) => i.priority === 'danger')
  const warning = items.filter((i) => i.priority === 'warning')
  const normal = items.filter((i) => i.priority === 'normal')

  return (
    <AdminLayout title="運用ボード">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="危険" value={danger.length} color="red" />
        <StatCard label="要注意" value={warning.length} color="yellow" />
        <StatCard label="通常" value={normal.length} color="gray" />
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-800">
            未提出・危険サイン（{getJstDateString()}）
          </h2>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-gray-600 font-medium">優先度</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">名前</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">連続未提出</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">スコア急落</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">ネガ検出</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400 text-sm">
                    対象の配信者がいません
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.streamer.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <Badge variant={priorityVariant[item.priority]}>
                        {priorityLabel[item.priority]}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {item.streamer.display_name}
                    </td>
                    <td className="px-6 py-3 text-gray-700">
                      {item.consecutiveMissing > 0 ? `${item.consecutiveMissing}日` : '—'}
                    </td>
                    <td className="px-6 py-3">
                      {item.scoreDrop && <Badge variant="yellow">急落</Badge>}
                    </td>
                    <td className="px-6 py-3">
                      {item.negativeDetected && <Badge variant="red">検出</Badge>}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/streamers/${item.streamer.id}`}
                        className="text-indigo-600 hover:text-indigo-800 text-sm"
                      >
                        詳細
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminLayout>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: 'red' | 'yellow' | 'gray'
}) {
  const colorClass = {
    red: 'text-red-600 bg-red-50 border-red-200',
    yellow: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    gray: 'text-gray-600 bg-gray-50 border-gray-200',
  }[color]

  return (
    <div className={`rounded-lg border px-6 py-4 ${colorClass}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  )
}
