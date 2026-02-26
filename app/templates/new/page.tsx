'use client'

import AdminLayout from '@/components/layout/AdminLayout'
import Button from '@/components/ui/Button'
import Card, { CardBody } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const EXAMPLE_SCHEMA = JSON.stringify(
  {
    fields: [
      { key: 'pre_announce', label: '配信告知をした', type: 'boolean', required: true },
      { key: 'pre_theme', label: 'テーマを決めた', type: 'boolean', required: true },
      { key: 'live_greeting', label: '挨拶ができた', type: 'boolean', required: true },
      { key: 'live_comment_reply', label: 'コメントに返信できた', type: 'boolean', required: true },
      { key: 'post_review', label: '配信後の振り返りをした', type: 'boolean', required: true },
      { key: 'post_memo', label: '今日の配信の感想', type: 'text', required: false },
    ],
  },
  null,
  2
)

export default function NewTemplatePage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    version: '1.0',
    schema_json: EXAMPLE_SCHEMA,
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      JSON.parse(form.schema_json)
    } catch {
      setError('JSON の形式が正しくありません')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '作成に失敗しました')
      }
      router.push('/templates')
    } catch (err) {
      setError(err instanceof Error ? err.message : '作成に失敗しました')
      setSubmitting(false)
    }
  }

  return (
    <AdminLayout title="テンプレ 新規作成">
      <div className="max-w-2xl">
        <Card>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  テンプレ名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="例: 標準テンプレ v1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  バージョン
                </label>
                <input
                  type="text"
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  スキーマ (JSON) <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-1">
                  type: "boolean" / "text"、key は pre_/live_/post_ のプレフィクスを推奨
                </p>
                <textarea
                  required
                  value={form.schema_json}
                  onChange={(e) => setForm({ ...form, schema_json: e.target.value })}
                  rows={16}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  onClick={() => router.push('/templates')}
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
