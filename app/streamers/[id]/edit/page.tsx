'use client'

import AdminLayout from '@/components/layout/AdminLayout'
import Button from '@/components/ui/Button'
import Card, { CardBody } from '@/components/ui/Card'
import { StreamerStatus } from '@/lib/types'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'

const STATUS_LABELS: Record<StreamerStatus, string> = {
  active: 'アクティブ',
  paused: '一時停止',
  graduated: '卒業',
  dropped: '離脱',
}

const LEVEL_LABELS: Record<number, string> = {
  1: 'Lv1',
  2: 'Lv2',
  3: 'Lv3',
  4: 'Lv4',
  5: 'Lv5',
  6: 'Lv6',
  7: 'Lv7',
  8: 'G',
}

export default function StreamerEditPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [channels, setChannels] = useState<{ id: string; name: string }[]>([])
  const [displayName, setDisplayName] = useState('')
  const [status, setStatus] = useState<StreamerStatus>('active')
  const [lineChannelId, setLineChannelId] = useState('')
  const [managerName, setManagerName] = useState('')
  const [tiktokId, setTiktokId] = useState('')
  const [lineUserId, setLineUserId] = useState('')
  const [levelOverride, setLevelOverride] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/line-channels')
      .then((r) => r.json())
      .then((data) => setChannels(data ?? []))
      .catch(() => {})

    fetch(`/api/streamers/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
          setLoading(false)
          return
        }
        setDisplayName(data.display_name ?? '')
        setStatus(data.status ?? 'active')
        setLineChannelId(data.line_channel_id ?? '')
        setManagerName(data.manager_name ?? '')
        setTiktokId(data.tiktok_id ?? '')
        setLineUserId(data.line_user_id ?? '')
        setLevelOverride(data.level_override !== null && data.level_override !== undefined ? String(data.level_override) : '')
        setNotes(data.notes ?? '')
        setLoading(false)
      })
      .catch(() => {
        setError('配信者情報の読み込みに失敗しました')
        setLoading(false)
      })
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!displayName.trim()) {
      setError('名前を入力してください')
      return
    }

    const body: Record<string, unknown> = {
      display_name: displayName.trim(),
      status,
      line_channel_id: lineChannelId || null,
      manager_name: managerName.trim() || null,
      tiktok_id: tiktokId.trim() || null,
      line_user_id: lineUserId.trim(),
      level_override: levelOverride !== '' ? Number(levelOverride) : null,
      notes: notes.trim() || null,
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/streamers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '更新に失敗しました')
      }
      router.push(`/streamers/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout title="配信者 編集">
        <p className="text-sm text-gray-500">読み込み中...</p>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="配信者 編集">
      <div className="max-w-2xl">
        <Card>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-5">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ステータス
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StreamerStatus)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    レベル
                  </label>
                  <select
                    value={levelOverride}
                    onChange={(e) => setLevelOverride(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">未設定</option>
                    {Object.entries(LEVEL_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  事務所（LINEチャネル）
                </label>
                <select
                  value={lineChannelId}
                  onChange={(e) => setLineChannelId(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">未設定</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>{ch.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  担当者
                </label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="例: 山田太郎"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TikTok ID
                </label>
                <input
                  type="text"
                  value={tiktokId}
                  onChange={(e) => setTiktokId(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="@username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LINE ID
                </label>
                <input
                  type="text"
                  value={lineUserId}
                  onChange={(e) => setLineUserId(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メモ
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? '更新中...' : '更新する'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push(`/streamers/${id}`)}
                >
                  キャンセル
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </AdminLayout>
  )
}
