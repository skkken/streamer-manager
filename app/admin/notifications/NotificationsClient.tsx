'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card, { CardHeader, CardBody } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'

type StreamerRow = {
  id: string
  display_name: string
  line_user_id: string | null
  status: string
  submitted: boolean
  has_line: boolean
}

export default function NotificationsClient({
  today,
  streamers,
}: {
  today: string
  streamers: StreamerRow[]
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const submitted = streamers.filter((s) => s.submitted)
  const notSubmitted = streamers.filter((s) => !s.submitted)

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllUnsubmitted = () => {
    const ids = notSubmitted.filter((s) => s.has_line).map((s) => s.id)
    setSelected(new Set(ids))
  }

  const deselectAll = () => setSelected(new Set())

  const handleSend = async () => {
    if (selected.size === 0) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/line/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamer_ids: Array.from(selected) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult(`エラー: ${data.error}`)
      } else {
        const parts = [`送信: ${data.sent}件`]
        if (data.failed > 0) parts.push(`失敗: ${data.failed}件`)
        if (data.errors?.length) parts.push(data.errors.join(', '))
        setResult(parts.join(' / '))
        setSelected(new Set())
        router.refresh()
      }
    } catch (err) {
      setResult('エラー: ' + (err instanceof Error ? err.message : '不明'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* サマリー */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border px-4 py-3 bg-green-50 border-green-200 text-green-800">
          <p className="text-xs font-medium">回答済み</p>
          <p className="text-2xl font-bold mt-0.5">{submitted.length}</p>
        </div>
        <div className="rounded-lg border px-4 py-3 bg-red-50 border-red-200 text-red-800">
          <p className="text-xs font-medium">未回答</p>
          <p className="text-2xl font-bold mt-0.5">{notSubmitted.length}</p>
        </div>
        <div className="rounded-lg border px-4 py-3 bg-gray-50 border-gray-200 text-gray-600">
          <p className="text-xs font-medium">全体</p>
          <p className="text-2xl font-bold mt-0.5">{streamers.length}</p>
        </div>
      </div>

      {/* 未回答者一覧 + 手動送信 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800">
                未回答者 — {today}（{notSubmitted.length}人）
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                チェックを入れてリマインド送信できます
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={selectAllUnsubmitted}>
                全選択
              </Button>
              <Button size="sm" variant="secondary" onClick={deselectAll}>
                全解除
              </Button>
            </div>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-10 px-4 py-3" />
                <th className="text-left px-4 py-3 text-gray-600 font-medium">名前</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">LINE連携</th>
              </tr>
            </thead>
            <tbody>
              {notSubmitted.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400 text-sm">
                    全員回答済みです
                  </td>
                </tr>
              ) : (
                notSubmitted.map((s) => (
                  <tr
                    key={s.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                      selected.has(s.id) ? 'bg-indigo-50' : ''
                    }`}
                    onClick={() => s.has_line && toggleSelect(s.id)}
                  >
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        disabled={!s.has_line}
                        onChange={() => toggleSelect(s.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{s.display_name}</td>
                    <td className="px-4 py-3">
                      {s.has_line ? (
                        <Badge variant="green">連携済み</Badge>
                      ) : (
                        <Badge variant="gray">未連携</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {notSubmitted.length > 0 && (
          <CardBody>
            <div className="flex items-center gap-3">
              <Button onClick={handleSend} disabled={sending || selected.size === 0}>
                {sending
                  ? '送信中...'
                  : `選択した ${selected.size} 人にリマインド送信`}
              </Button>
              {result && (
                <span className="text-sm text-gray-600 bg-gray-50 rounded px-3 py-1">
                  {result}
                </span>
              )}
            </div>
          </CardBody>
        )}
      </Card>

      {/* 回答済み一覧 */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-800">
            回答済み — {today}（{submitted.length}人）
          </h2>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-gray-600 font-medium">名前</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">状態</th>
              </tr>
            </thead>
            <tbody>
              {submitted.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-gray-400 text-sm">
                    まだ回答者がいません
                  </td>
                </tr>
              ) : (
                submitted.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.display_name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="green">回答済み</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
