'use client'

import AdminLayout from '@/components/layout/AdminLayout'
import Button from '@/components/ui/Button'
import Card, { CardBody } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

type ChannelOption = { id: string; name: string }

export default function NewStreamerPage() {
  const router = useRouter()
  const [channels, setChannels] = useState<ChannelOption[]>([])
  const [form, setForm] = useState({
    display_name: '',
    line_channel_id: '',
    manager_name: '',
    tiktok_id: '',
    line_user_id: '',
    status: 'active',
    notify_enabled: true,
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/line-channels')
      .then((r) => r.json())
      .then((data) => setChannels(data ?? []))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/streamers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          line_channel_id: form.line_channel_id || null,
          manager_name: form.manager_name.trim() || null,
          tiktok_id: form.tiktok_id.trim() || null,
        }),
      })
      if (!res.ok) {
        let message = '作成に失敗しました'
        const text = await res.text()
        if (text) {
          try { message = JSON.parse(text).error ?? message } catch (_e) {}
        }
        throw new Error(message)
      }
      router.push('/streamers')
    } catch (err) {
      setError(err instanceof Error ? err.message : '作成に失敗しました')
      setSubmitting(false)
    }
  }

  return (
    <AdminLayout title="配信者 新規作成">
      <div className="max-w-lg">
        <Card>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="例: 田中サクラ"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ステータス
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">アクティブ</option>
                    <option value="paused">一時停止</option>
                    <option value="graduated">卒業</option>
                    <option value="dropped">離脱</option>
                  </select>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.notify_enabled}
                      onChange={(e) => setForm({ ...form, notify_enabled: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    LINE通知を有効にする
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  事務所（LINEチャネル）
                </label>
                <select
                  value={form.line_channel_id}
                  onChange={(e) => setForm({ ...form, line_channel_id: e.target.value })}
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
                  value={form.manager_name}
                  onChange={(e) => setForm({ ...form, manager_name: e.target.value })}
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
                  value={form.tiktok_id}
                  onChange={(e) => setForm({ ...form, tiktok_id: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="@username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LINE ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.line_user_id}
                  onChange={(e) => setForm({ ...form, line_user_id: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メモ
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="任意のメモ"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? '作成中...' : '作成する'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push('/streamers')}
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
