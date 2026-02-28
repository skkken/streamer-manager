'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card, { CardHeader, CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import type { CronSetting } from '@/lib/cron-settings'

const JOB_LABELS: Record<string, string> = {
  'schedule-daily-checkin': 'デイリーチェックインスケジュール',
  'worker-send-line': 'LINE送信ワーカー',
}

export default function CronClient({ initial }: { initial: CronSetting[] }) {
  const router = useRouter()
  const [settings, setSettings] = useState(initial)
  const [toggling, setToggling] = useState<string | null>(null)
  const [triggering, setTriggering] = useState<string | null>(null)
  const [triggerResult, setTriggerResult] = useState<Record<string, { ok: boolean; text: string }>>({})

  const handleToggle = async (jobKey: string, currentEnabled: boolean) => {
    setToggling(jobKey)
    try {
      const res = await fetch('/api/cron-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_key: jobKey, enabled: !currentEnabled }),
      })
      if (res.ok) {
        setSettings((prev) =>
          prev.map((s) =>
            s.job_key === jobKey ? { ...s, enabled: !currentEnabled } : s
          )
        )
      }
    } finally {
      setToggling(null)
    }
  }

  const handleTrigger = async (jobKey: string) => {
    setTriggering(jobKey)
    setTriggerResult((prev) => ({ ...prev, [jobKey]: { ok: true, text: '' } }))
    try {
      const res = await fetch('/api/cron-settings/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_key: jobKey }),
      })
      const data = await res.json()
      if (res.ok) {
        setTriggerResult((prev) => ({
          ...prev,
          [jobKey]: { ok: true, text: '実行完了: ' + JSON.stringify(data.result) },
        }))
        router.refresh()
      } else {
        setTriggerResult((prev) => ({
          ...prev,
          [jobKey]: { ok: false, text: 'エラー: ' + (data.error ?? '不明') },
        }))
      }
    } catch {
      setTriggerResult((prev) => ({
        ...prev,
        [jobKey]: { ok: false, text: 'エラー: ネットワークエラー' },
      }))
    } finally {
      setTriggering(null)
    }
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return '---'
    return new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
  }

  return (
    <div className="space-y-6">
      {settings.map((s) => {
        const label = JOB_LABELS[s.job_key] ?? s.job_key
        const result = triggerResult[s.job_key]
        return (
          <Card key={s.job_key}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-800">{label}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
                </div>
                <Badge variant={s.enabled ? 'green' : 'red'}>
                  {s.enabled ? '有効' : '無効'}
                </Badge>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-gray-500">スケジュール</dt>
                  <dd className="text-gray-900 font-mono">{s.schedule}</dd>
                  <dt className="text-gray-500">最終実行</dt>
                  <dd className="text-gray-900">{formatDate(s.last_run_at)}</dd>
                  <dt className="text-gray-500">最終結果</dt>
                  <dd className="text-gray-900 font-mono text-xs break-all">
                    {s.last_result ? JSON.stringify(s.last_result) : '---'}
                  </dd>
                </dl>

                <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                  <Button
                    variant={s.enabled ? 'danger' : 'primary'}
                    size="sm"
                    onClick={() => handleToggle(s.job_key, s.enabled)}
                    disabled={toggling === s.job_key}
                  >
                    {toggling === s.job_key
                      ? '更新中...'
                      : s.enabled
                        ? '無効にする'
                        : '有効にする'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleTrigger(s.job_key)}
                    disabled={triggering === s.job_key}
                  >
                    {triggering === s.job_key ? '実行中...' : '手動実行'}
                  </Button>
                </div>

                {result?.text && (
                  <p
                    className={`text-sm rounded px-3 py-2 ${
                      result.ok
                        ? 'text-green-700 bg-green-50'
                        : 'text-red-700 bg-red-50'
                    }`}
                  >
                    {result.text}
                  </p>
                )}
              </div>
            </CardBody>
          </Card>
        )
      })}
    </div>
  )
}
