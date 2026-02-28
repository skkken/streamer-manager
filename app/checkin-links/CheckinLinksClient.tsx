'use client'

import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import { StreamerStatus } from '@/lib/types'
import { useState } from 'react'

const statusVariant: Record<StreamerStatus, 'green' | 'yellow' | 'gray' | 'red'> = {
  active: 'green',
  paused: 'yellow',
  graduated: 'gray',
  dropped: 'red',
}
const statusLabel: Record<StreamerStatus, string> = {
  active: 'アクティブ',
  paused: '一時停止',
  graduated: '卒業',
  dropped: '離脱',
}

type StreamerItem = {
  id: string
  display_name: string
  status: StreamerStatus
}

type TokenState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; url: string; expires_at: string }
  | { status: 'error'; message: string }
  | { status: 'already' }

function CopyButton({ text, label = 'コピー' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
    >
      {copied ? '✓ コピー済み' : label}
    </button>
  )
}

function TokenCell({ streamerId }: { streamerId: string }) {
  const [state, setState] = useState<TokenState>({ status: 'idle' })

  const handleIssue = async () => {
    setState({ status: 'loading' })
    try {
      const res = await fetch('/api/checkin/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamer_id: streamerId }),
      })
      const data = await res.json()
      if (res.status === 409) {
        setState({ status: 'already' })
        return
      }
      if (!res.ok) {
        setState({ status: 'error', message: data.error ?? '発行に失敗しました' })
        return
      }
      setState({ status: 'done', url: data.url, expires_at: data.expires_at })
    } catch {
      setState({ status: 'error', message: '発行に失敗しました' })
    }
  }

  if (state.status === 'idle') {
    return (
      <button
        onClick={handleIssue}
        className="px-3 py-1 text-xs rounded border border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-colors"
      >
        トークン発行
      </button>
    )
  }
  if (state.status === 'loading') {
    return <span className="text-xs text-gray-400">発行中...</span>
  }
  if (state.status === 'already') {
    return (
      <span className="text-xs text-gray-400">
        本日分は発行済み（URLは再取得不可）
      </span>
    )
  }
  if (state.status === 'error') {
    return <span className="text-xs text-red-500">{state.message}</span>
  }
  // done
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="font-mono text-xs text-gray-600 truncate max-w-[220px]" title={state.url}>
        {state.url}
      </span>
      <CopyButton text={state.url} />
      <span className="text-xs text-gray-400 shrink-0">
        {new Date(state.expires_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}まで
      </span>
    </div>
  )
}

export default function CheckinLinksClient({
  streamers,
  baseUrl,
  today,
}: {
  streamers: StreamerItem[]
  baseUrl: string
  today: string
}) {
  const [filter, setFilter] = useState<'all' | 'active'>('active')

  const rows = filter === 'active'
    ? streamers.filter((s) => s.status === 'active')
    : streamers

  return (
    <>
      <div className="flex items-center gap-4 mb-4">
        <p className="text-sm text-gray-500">対象日: <span className="font-medium text-gray-700">{today}</span></p>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              filter === 'active'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-300 text-gray-500 hover:bg-gray-50'
            }`}
          >
            アクティブのみ
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              filter === 'all'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-300 text-gray-500 hover:bg-gray-50'
            }`}
          >
            全員
          </button>
        </div>
        <span className="text-xs text-gray-400">{rows.length} 件</span>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-gray-600 font-medium">名前</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">ステータス</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">テストURL</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">本日トークン</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const testUrl = `${baseUrl}/checkin?streamerId=${s.id}`
                return (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.display_name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[s.status]}>{statusLabel[s.status]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-500 truncate max-w-[180px]" title={testUrl}>
                          ?streamerId={s.id.slice(0, 8)}…
                        </span>
                        <CopyButton text={testUrl} />
                        <a
                          href={testUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-500 hover:underline shrink-0"
                        >
                          開く
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <TokenCell streamerId={s.id} />
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-400">
                    配信者がいません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-3 text-xs text-gray-400">
        ※ テストURL はトークン不要でいつでもアクセス可。本日トークンは当日中のみ有効で1回限り使用可。トークン発行後はURLを必ずコピーしてください（再表示不可）。
      </p>
    </>
  )
}
