import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { captureApiError } from '@/lib/error-logger'

const VALID_JOBS = ['schedule-daily-checkin', 'worker-send-line']

export async function POST(req: NextRequest) {
  const { errorResponse } = await requireAuth()
  if (errorResponse) return errorResponse

  try {
    const { job_key } = await req.json()

    if (!VALID_JOBS.includes(job_key)) {
      return NextResponse.json({ error: '不正な job_key です' }, { status: 400 })
    }

    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      return NextResponse.json({ error: 'CRON_SECRET が未設定です' }, { status: 500 })
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : 'http://localhost:3000')

    const res = await fetch(`${appUrl}/api/cron/${job_key}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cronSecret}` },
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error ?? '実行に失敗しました', details: data },
        { status: res.status }
      )
    }

    return NextResponse.json({ success: true, result: data })
  } catch (e) {
    captureApiError(e, '/api/cron-settings/trigger', 'POST')
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
