'use client'

import { useState, useEffect, useCallback } from 'react'
import Badge from '@/components/ui/Badge'
import Card, { CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

type ErrorLog = {
  id: string
  created_at: string
  route: string
  method: string
  message: string | null
  stack: string | null
  extra: Record<string, unknown> | null
  resolved: boolean
}

export default function ErrorLogsClient() {
  const [logs, setLogs] = useState<ErrorLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const limit = 30

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/error-logs?limit=${limit}&offset=${offset}`)
      const json = await res.json()
      setLogs(json.data ?? [])
      setTotal(json.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [offset])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const toggleResolved = async (id: string, resolved: boolean) => {
    await fetch('/api/error-logs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, resolved }),
    })
    setLogs((prev) => prev.map((l) => (l.id === id ? { ...l, resolved } : l)))
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
  }

  const totalPages = Math.ceil(total / limit)
  const currentPage = Math.floor(offset / limit) + 1

  return (
    <div className="space-y-4">
      {/* サマリー */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          全 {total} 件{total > 0 && `（${currentPage} / ${totalPages} ページ）`}
        </p>
        <Button size="sm" variant="secondary" onClick={fetchLogs} disabled={loading}>
          {loading ? '読込中...' : '更新'}
        </Button>
      </div>

      {/* ログ一覧 */}
      {logs.length === 0 && !loading ? (
        <Card>
          <div className="px-6 py-12 text-center text-gray-400">
            エラーログはありません
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardHeader>
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={log.resolved ? 'green' : 'red'}>
                        {log.resolved ? '解決済み' : '未解決'}
                      </Badge>
                      <span className="text-xs font-mono text-gray-500">
                        {log.method}
                      </span>
                      <span className="text-sm font-mono font-medium text-gray-800">
                        {log.route}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 truncate">
                      {log.message || '(メッセージなし)'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(log.created_at)}
                    </p>
                  </div>
                  <span className="text-gray-400 text-sm ml-2">
                    {expandedId === log.id ? '▲' : '▼'}
                  </span>
                </div>
              </CardHeader>

              {expandedId === log.id && (
                <div className="px-6 pb-4 space-y-3">
                  {log.stack && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">スタックトレース</p>
                      <pre className="text-xs bg-gray-50 rounded p-3 overflow-x-auto whitespace-pre-wrap text-gray-700 max-h-48 overflow-y-auto">
                        {log.stack}
                      </pre>
                    </div>
                  )}
                  {log.extra && Object.keys(log.extra).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">追加情報</p>
                      <pre className="text-xs bg-gray-50 rounded p-3 overflow-x-auto text-gray-700">
                        {JSON.stringify(log.extra, null, 2)}
                      </pre>
                    </div>
                  )}
                  <div className="pt-2">
                    <Button
                      size="sm"
                      variant={log.resolved ? 'secondary' : 'primary'}
                      onClick={() => toggleResolved(log.id, !log.resolved)}
                    >
                      {log.resolved ? '未解決に戻す' : '解決済みにする'}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - limit))}
          >
            前へ
          </Button>
          <span className="text-sm text-gray-500">
            {currentPage} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={offset + limit >= total}
            onClick={() => setOffset(offset + limit)}
          >
            次へ
          </Button>
        </div>
      )}
    </div>
  )
}
