import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getJstDateString } from '@/lib/jst'
import { sendLineMessage, buildCheckinMessage, buildThanksMessage } from '@/lib/line'
import type { AiType } from '@/lib/types'
import { getMessageSettings } from '@/lib/messages'
import { isCronEnabled, updateCronResult } from '@/lib/cron-settings'
import { verifyCronSecret } from '@/lib/cron-auth'
import { decrypt } from '@/lib/crypto'
import { getAppUrl } from '@/lib/app-url'

const BATCH_LIMIT = 50
const LOCK_TIMEOUT_MINUTES = 5 // 5分以上前にロックされたジョブは再取得可能

/**
 * POST /api/cron/worker-send-line
 *
 * Vercel Cron: 毎分 00:05〜01:00 JST = 15:05〜16:00 UTC
 * vercel.json: { "crons": [{ "path": "/api/cron/worker-send-line", "schedule": "5-59 15 * * *" }] }
 * ※ 5〜59分 (00:05-00:59 JST) + 16:00 UTC (01:00 JST)
 *
 * 処理:
 * 1. queued / 5分以上前にロックされたジョブを LIMIT 50 取得
 * 2. locked_at を更新（楽観的ロック）
 * 3. ジョブ種別に応じてLINE送信
 * 4. 成功→sent、失敗→attempts+1、attempts>=3→failed
 */
export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const JOB_KEY = 'worker-send-line'
  if (!(await isCronEnabled(JOB_KEY))) {
    return NextResponse.json({ message: 'disabled', job: JOB_KEY })
  }

  const supabase = createServerClient()
  const today = getJstDateString()
  const lockCutoff = new Date(Date.now() - LOCK_TIMEOUT_MINUTES * 60 * 1000).toISOString()
  const nowIso = new Date().toISOString()
  const messages = await getMessageSettings()

  // queued or 古いロックのジョブを取得
  const { data: jobs, error: fetchErr } = await supabase
    .from('line_jobs')
    .select('*')
    .eq('date', today)
    .or(`status.eq.queued,and(status.eq.sending,locked_at.lt.${lockCutoff})`)
    .order('created_at')
    .limit(BATCH_LIMIT)

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }
  if (!jobs?.length) {
    const noJobsResult = { message: 'no jobs', processed: 0 }
    await updateCronResult(JOB_KEY, noJobsResult).catch(() => {})
    return NextResponse.json(noJobsResult)
  }

  const jobIds = jobs.map((j) => j.id)

  // sending + locked_at でロック
  await supabase
    .from('line_jobs')
    .update({ status: 'sending', locked_at: nowIso })
    .in('id', jobIds)

  // バッチで配信者情報とチャネルトークンを一括取得（N+1 回避）
  const streamerIds = [...new Set(jobs.map((j) => j.streamer_id))]
  const channelIds = [...new Set(jobs.map((j) => j.line_channel_id).filter(Boolean))] as string[]

  const [streamersRes, channelsRes] = await Promise.all([
    supabase
      .from('streamers')
      .select('id, display_name, line_user_id, notify_enabled, status, level_override, level_current')
      .in('id', streamerIds),
    channelIds.length > 0
      ? supabase.from('line_channels').select('id, channel_access_token').in('id', channelIds)
      : Promise.resolve({ data: [] as { id: string; channel_access_token: string }[] }),
  ])

  const streamerMap = new Map((streamersRes.data ?? []).map((s) => [s.id, s]))
  const channelTokenCache = new Map<string, string>()
  for (const ch of channelsRes.data ?? []) {
    if (ch.channel_access_token) {
      try {
        channelTokenCache.set(ch.id, decrypt(ch.channel_access_token))
      } catch {
        channelTokenCache.set(ch.id, ch.channel_access_token)
      }
    }
  }

  function getChannelToken(lineChannelId: string | null): string | undefined {
    if (!lineChannelId) return undefined
    return channelTokenCache.get(lineChannelId)
  }

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const job of jobs) {
    const streamer = streamerMap.get(job.streamer_id) ?? null
    const channelToken = getChannelToken(job.line_channel_id as string | null)

    // レベル未設定（0含む）の場合はスキップ
    const effectiveLevel = streamer?.level_override ?? (streamer?.level_current || null)

    // 無効化・レベル未設定・レベルG(8)の場合はスキップ
    if (
      !streamer ||
      streamer.status !== 'active' ||
      !streamer.notify_enabled ||
      effectiveLevel === null ||
      effectiveLevel === 8
    ) {
      await supabase
        .from('line_jobs')
        .update({ status: 'skipped', locked_at: null })
        .eq('id', job.id)
      skipped++
      continue
    }

    let sendResult: { ok: boolean; error?: string }

    if (job.kind === 'daily_checkin') {
      // チェックインリンクを生成するためにトークンを取得
      const { data: tokenRow } = await supabase
        .from('checkin_tokens')
        .select('token_hash')
        .eq('streamer_id', job.streamer_id)
        .eq('date', today)
        .single()

      if (!tokenRow) {
        sendResult = { ok: false, error: 'checkin token not found' }
      } else {
        // ハッシュからURLは生成できないので、生のトークンを再発行してDBを上書き
        const { generateToken, hashToken } = await import('@/lib/token')
        const { getTokenExpiry } = await import('@/lib/jst')
        const rawToken = generateToken()
        const newHash = hashToken(rawToken)
        const expiresAt = getTokenExpiry(today).toISOString()

        // 使用済みトークンはリセットしない
        const { count } = await supabase
          .from('checkin_tokens')
          .update({ token_hash: newHash, expires_at: expiresAt })
          .eq('streamer_id', job.streamer_id)
          .eq('date', today)
          .is('used_at', null)

        if (count === 0) {
          // 既にチェックイン済み → 送信スキップ
          await supabase
            .from('line_jobs')
            .update({ status: 'skipped', locked_at: null })
            .eq('id', job.id)
          skipped++
          continue
        }

        const appUrl = getAppUrl()
        const url = `${appUrl}/checkin?t=${rawToken}`
        const [, mm, dd] = today.split('-')
        const dateLabel = `${Number(mm)}月${Number(dd)}日`
        const msg = buildCheckinMessage(streamer.display_name, url, dateLabel)
        sendResult = await sendLineMessage(streamer.line_user_id, [msg], channelToken)
      }
    } else if (job.kind === 'checkin_thanks') {
      // 当日のself_checkのai_typeを取得
      const { data: check } = await supabase
        .from('self_checks')
        .select('ai_type')
        .eq('streamer_id', job.streamer_id)
        .eq('date', today)
        .single()

      const aiType = (check?.ai_type as AiType) ?? 'NORMAL'
      const msg = buildThanksMessage(aiType, messages)
      sendResult = await sendLineMessage(streamer.line_user_id, [msg], channelToken)
    } else {
      sendResult = { ok: false, error: `unknown kind: ${job.kind}` }
    }

    if (sendResult.ok) {
      await supabase
        .from('line_jobs')
        .update({ status: 'sent', locked_at: null, last_error: null })
        .eq('id', job.id)
      sent++
    } else {
      const newAttempts = job.attempts + 1
      const newStatus = newAttempts >= 3 ? 'failed' : 'queued'
      await supabase
        .from('line_jobs')
        .update({
          status: newStatus,
          attempts: newAttempts,
          last_error: sendResult.error ?? 'unknown',
          locked_at: null,
        })
        .eq('id', job.id)
      failed++
    }
  }

  const responseBody = {
    message: 'done',
    total: jobs.length,
    sent,
    failed,
    skipped,
  }
  await updateCronResult(JOB_KEY, responseBody).catch(() => {})
  return NextResponse.json(responseBody)
}

export const GET = POST
