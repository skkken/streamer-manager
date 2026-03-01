import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getJstDateString } from '@/lib/jst'
import { BoardItem, BoardPriority } from '@/lib/types'
import { requireAuth } from '@/lib/auth-guard'
import { detectNegativeInText } from '@/lib/ai'

export async function GET() {
  const { errorResponse } = await requireAuth()
  if (errorResponse) return errorResponse

  const supabase = createServerClient()
  const today = getJstDateString()

  // 過去7日分の日付リスト
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setTime(d.getTime() + 9 * 60 * 60 * 1000 - i * 86400000)
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${day}`)
  }

  // active配信者を全件取得
  const { data: streamers } = await supabase
    .from('streamers')
    .select('*')
    .eq('status', 'active')
    .order('display_name')

  if (!streamers?.length) {
    return NextResponse.json([])
  }

  const streamerIds = streamers.map((s) => s.id)

  // 過去7日分のself_checksを取得
  const { data: checks } = await supabase
    .from('self_checks')
    .select('*')
    .in('streamer_id', streamerIds)
    .in('date', dates)
    .order('date', { ascending: false })

  const checksByStreamer = new Map<string, typeof checks>()
  for (const check of checks ?? []) {
    if (!checksByStreamer.has(check.streamer_id)) {
      checksByStreamer.set(check.streamer_id, [])
    }
    checksByStreamer.get(check.streamer_id)!.push(check)
  }

  const boardItems: BoardItem[] = streamers.map((streamer) => {
    const myChecks = checksByStreamer.get(streamer.id) ?? []
    const todayCheck = myChecks.find((c) => c.date === today) ?? null

    // 連続未提出日数
    let consecutiveMissing = 0
    for (const date of dates) {
      const hasCheck = myChecks.some((c) => c.date === date)
      if (!hasCheck) {
        consecutiveMissing++
      } else {
        break
      }
    }

    // スコア急落（直近7日平均より-20以上）
    const scoredChecks = myChecks.filter((c) => c.overall_score !== null)
    let scoreDrop = false
    if (scoredChecks.length >= 2 && todayCheck?.overall_score !== null) {
      const avg7 =
        scoredChecks.reduce((sum, c) => sum + (c.overall_score ?? 0), 0) /
        scoredChecks.length
      const todayScore = todayCheck?.overall_score ?? null
      if (todayScore !== null && avg7 - todayScore >= 20) {
        scoreDrop = true
      }
    }

    // ネガワード検出（直近チェックのmemo/text answers）
    let negativeDetected = false
    if (todayCheck) {
      if (detectNegativeInText(todayCheck.memo)) negativeDetected = true
      if (todayCheck.ai_negative_detected) negativeDetected = true
      // answers内のtext値も確認
      if (todayCheck.answers) {
        const textVals = Object.values(todayCheck.answers).filter(
          (v) => typeof v === 'string'
        ) as string[]
        if (detectNegativeInText(textVals.join(' '))) negativeDetected = true
      }
    }

    // 優先度決定
    let priority: BoardPriority = 'normal'
    if (consecutiveMissing >= 3 || (negativeDetected && consecutiveMissing >= 1)) {
      priority = 'danger'
    } else if (
      consecutiveMissing === 2 ||
      scoreDrop ||
      negativeDetected
    ) {
      priority = 'warning'
    }

    return {
      streamer,
      priority,
      consecutiveMissing,
      scoreDrop,
      negativeDetected,
      latestCheck: todayCheck,
    }
  })

  // 優先度でソート（危険>要注意>通常）
  const priorityOrder: Record<BoardPriority, number> = { danger: 0, warning: 1, normal: 2 }
  boardItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return NextResponse.json(boardItems)
}
