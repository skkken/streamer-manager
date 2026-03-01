import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateToken, hashToken } from '@/lib/token'
import { getJstDateString, getTokenExpiry } from '@/lib/jst'
import { isCronEnabled, updateCronResult } from '@/lib/cron-settings'
import { verifyCronSecret } from '@/lib/cron-auth'

/**
 * POST /api/cron/schedule-daily-checkin
 *
 * Vercel Cron: 毎日 05:05 JST = 20:05 UTC（営業日境界 05:00 の直後）
 * vercel.json: { "crons": [{ "path": "/api/cron/schedule-daily-checkin", "schedule": "5 20 * * *" }] }
 *
 * 処理:
 * 1. notify_enabled=true の active 配信者を全取得
 * 2. checkin_tokens を発行（当日分 upsert: 既存なら skip）
 * 3. line_jobs に daily_checkin キューを積む（冪等）
 */
export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const JOB_KEY = 'schedule-daily-checkin'
  if (!(await isCronEnabled(JOB_KEY))) {
    return NextResponse.json({ message: 'disabled', job: JOB_KEY })
  }

  const supabase = createServerClient()
  const date = getJstDateString()
  const expiresAt = getTokenExpiry(date).toISOString()

  // active + 通知有効な配信者を取得
  const { data: streamers, error: sErr } = await supabase
    .from('streamers')
    .select('id, display_name, line_user_id, line_channel_id, level_current, level_override')
    .eq('status', 'active')
    .eq('notify_enabled', true)

  if (sErr) {
    return NextResponse.json({ error: sErr.message }, { status: 500 })
  }
  if (!streamers?.length) {
    return NextResponse.json({ message: '対象なし', count: 0 })
  }

  let tokenCreated = 0
  let jobCreated = 0

  for (const streamer of streamers) {
    // レベルG(8)はチェックインリンクを送らない
    const effectiveLevel = streamer.level_override ?? (streamer.level_current || null)
    if (effectiveLevel === 8) continue

    // --- トークン発行（冪等: UNIQUE(streamer_id, date)）---
    const rawToken = generateToken()
    const tokenHash = hashToken(rawToken)

    const { error: tokenErr } = await supabase
      .from('checkin_tokens')
      .upsert(
        {
          streamer_id: streamer.id,
          date,
          token_hash: tokenHash,
          expires_at: expiresAt,
        },
        { onConflict: 'streamer_id,date', ignoreDuplicates: true }
      )

    if (!tokenErr) tokenCreated++

    // --- line_jobs に daily_checkin キュー（冪等）---
    const { error: jobErr } = await supabase
      .from('line_jobs')
      .upsert(
        {
          streamer_id: streamer.id,
          date,
          kind: 'daily_checkin',
          status: 'queued',
          attempts: 0,
          line_channel_id: streamer.line_channel_id,
        },
        { onConflict: 'streamer_id,date,kind', ignoreDuplicates: true }
      )

    if (!jobErr) jobCreated++
  }

  const responseBody = {
    message: 'scheduled',
    date,
    streamer_count: streamers.length,
    token_created: tokenCreated,
    job_created: jobCreated,
  }
  await updateCronResult(JOB_KEY, responseBody).catch(() => {})
  return NextResponse.json(responseBody)
}

// Vercel Cron は GET も使う
export const GET = POST
