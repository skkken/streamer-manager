'use client'

import AdminLayout from '@/components/layout/AdminLayout'
import Button from '@/components/ui/Button'
import Card, { CardBody } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function NewStreamerPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    display_name: '',
    line_user_id: '',
    status: 'active',
    notify_enabled: true,
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/streamers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '作成に失敗しました')
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
                  表示名 <span className="text-red-500">*</span>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LINE ユーザーID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.line_user_id}
                  onChange={(e) => setForm({ ...form, line_user_id: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="例: Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
              </div>

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

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="notify_enabled"
                  checked={form.notify_enabled}
                  onChange={(e) => setForm({ ...form, notify_enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="notify_enabled" className="text-sm text-gray-700">
                  LINE通知を有効にする
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メモ
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
