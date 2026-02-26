'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Card, { CardBody } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'

export default function NotificationsClient({ today }: { today: string }) {
  const router = useRouter()
  const [scheduling, setScheduling] = useState(false)
  const [working, setWorking] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const runSchedule = async () => {
    setScheduling(true)
    setResult(null)
    try {
      const res = await fetch('/api/cron/schedule-daily-checkin', { method: 'POST' })
      const data = await res.json()
      setResult(`ジョブ作成完了: ${data.job_created ?? 0} 件 (${data.date})`)
      router.refresh()
    } catch (err) {
      setResult('エラー: ' + (err instanceof Error ? err.message : '不明'))
    } finally {
      setScheduling(false)
    }
  }

  const runWorker = async () => {
    setWorking(true)
    setResult(null)
    try {
      const res = await fetch('/api/cron/worker-send-line', { method: 'POST' })
      const data = await res.json()
      setResult(
        `送信完了: sent=${data.sent}, failed=${data.failed}, skipped=${data.skipped}`
      )
      router.refresh()
    } catch (err) {
      setResult('エラー: ' + (err instanceof Error ? err.message : '不明'))
    } finally {
      setWorking(false)
    }
  }

  return (
    <Card className="mb-6">
      <CardBody>
        <p className="text-sm font-medium text-gray-700 mb-3">手動実行（{today}）</p>
        <div className="flex gap-3 flex-wrap">
          <Button
            size="sm"
            variant="secondary"
            onClick={runSchedule}
            disabled={scheduling || working}
          >
            {scheduling ? '実行中...' : 'ジョブ作成（schedule-daily-checkin）'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={runWorker}
            disabled={scheduling || working}
          >
            {working ? '実行中...' : '送信ワーカー実行（worker-send-line）'}
          </Button>
        </div>
        {result && (
          <p className="text-xs text-gray-600 mt-3 bg-gray-50 rounded px-3 py-2">
            {result}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-2">
          ※ 本番では Vercel Cron が自動実行（JST 00:05〜01:00）
        </p>
      </CardBody>
    </Card>
  )
}
