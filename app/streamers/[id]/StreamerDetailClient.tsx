'use client'

import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card, { CardBody } from '@/components/ui/Card'
import { Streamer, SelfCheck, StaffNote, AiType, StreamerStatus, StaffNoteStatus } from '@/lib/types'
import { useState } from 'react'
import Link from 'next/link'

const statusLabel: Record<StreamerStatus, string> = {
  active: 'アクティブ',
  paused: '一時停止',
  graduated: '卒業',
  dropped: '離脱',
}

const statusVariant: Record<StreamerStatus, 'green' | 'yellow' | 'gray' | 'red'> = {
  active: 'green',
  paused: 'yellow',
  graduated: 'gray',
  dropped: 'red',
}

const noteStatusVariant: Record<StaffNoteStatus, 'red' | 'yellow' | 'gray'> = {
  open: 'red',
  watching: 'yellow',
  closed: 'gray',
}

export default function StreamerDetailClient({
  streamer,
  checks,
  notes,
}: {
  streamer: Streamer
  checks: SelfCheck[]
  notes: StaffNote[]
}) {
  const [tab, setTab] = useState<'checks' | 'notes'>('checks')

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* プロフィールカード */}
      <div className="col-span-1">
        <Card>
          <CardBody>
            <h2 className="text-lg font-bold text-gray-900 mb-2">{streamer.display_name}</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">ステータス</span>
                <Badge variant={statusVariant[streamer.status]}>
                  {statusLabel[streamer.status]}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">通知</span>
                <Badge variant={streamer.notify_enabled ? 'green' : 'gray'}>
                  {streamer.notify_enabled ? 'ON' : 'OFF'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">LINE ID</span>
                <span className="text-gray-700 font-mono text-xs truncate max-w-[140px]">
                  {streamer.line_user_id}
                </span>
              </div>
            </div>
            {streamer.notes && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-1">メモ</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{streamer.notes}</p>
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <Link href={`/streamers/${streamer.id}/edit`} className="flex-1">
                <Button size="sm" variant="secondary" className="w-full">
                  編集
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* タブコンテンツ */}
      <div className="col-span-2">
        <div className="flex gap-2 mb-4 border-b border-gray-200">
          <button
            onClick={() => setTab('checks')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === 'checks'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Self Checks ({checks.length})
          </button>
          <button
            onClick={() => setTab('notes')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === 'notes'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Staff Notes ({notes.length})
          </button>
        </div>

        {tab === 'checks' && (
          <Card>
            {checks.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-400">
                まだ自己評価データがありません
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-4 py-3 text-gray-600">日付</th>
                      <th className="text-left px-4 py-3 text-gray-600">スコア</th>
                      <th className="text-left px-4 py-3 text-gray-600">判定</th>
                      <th className="text-left px-4 py-3 text-gray-600">ネガ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checks.map((c) => (
                      <tr key={c.id} className="border-b border-gray-100">
                        <td className="px-4 py-3 text-gray-700">{c.date}</td>
                        <td className="px-4 py-3 font-medium">
                          {c.overall_score ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          {c.ai_type && (
                            <Badge
                              variant={
                                c.ai_type === 'GOOD'
                                  ? 'green'
                                  : c.ai_type === 'SUPPORT'
                                  ? 'red'
                                  : 'yellow'
                              }
                            >
                              {c.ai_type}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {c.ai_negative_detected && (
                            <Badge variant="red">検出</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {tab === 'notes' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm">+ ノート追加</Button>
            </div>
            <Card>
              {notes.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-gray-400">
                  まだスタッフノートがありません
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left px-4 py-3 text-gray-600">日付</th>
                        <th className="text-left px-4 py-3 text-gray-600">カテゴリ</th>
                        <th className="text-left px-4 py-3 text-gray-600">状態</th>
                        <th className="text-left px-4 py-3 text-gray-600">ステータス</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notes.map((n) => (
                        <tr key={n.id} className="border-b border-gray-100">
                          <td className="px-4 py-3 text-gray-700">{n.date}</td>
                          <td className="px-4 py-3">{n.category}</td>
                          <td className="px-4 py-3">{n.current_state}</td>
                          <td className="px-4 py-3">
                            <Badge variant={noteStatusVariant[n.status]}>{n.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
