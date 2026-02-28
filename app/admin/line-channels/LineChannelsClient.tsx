'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card, { CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

type Channel = {
  id: string
  name: string
  channel_id: string
  is_active: boolean
  webhook_path: string
  created_at: string
  updated_at: string
}

type FormData = {
  name: string
  channel_id: string
  channel_secret: string
  channel_access_token: string
}

const emptyForm: FormData = {
  name: '',
  channel_id: '',
  channel_secret: '',
  channel_access_token: '',
}

function getWebhookUrl(webhookPath: string) {
  const base =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? ''
  return `${base}/api/line/webhook/${webhookPath}`
}

export default function LineChannelsClient({ channels }: { channels: Channel[] }) {
  const router = useRouter()
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [showSecrets, setShowSecrets] = useState(false)

  const handleCreate = () => {
    setMode('create')
    setEditId(null)
    setForm(emptyForm)
    setError('')
    setShowSecrets(false)
  }

  const handleEdit = (ch: Channel) => {
    setMode('edit')
    setEditId(ch.id)
    setForm({
      name: ch.name,
      channel_id: ch.channel_id,
      channel_secret: '',
      channel_access_token: '',
    })
    setError('')
    setShowSecrets(false)
  }

  const handleCancel = () => {
    setMode('list')
    setEditId(null)
    setError('')
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      if (mode === 'create') {
        const res = await fetch('/api/line-channels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? '作成に失敗しました')
        }
      } else if (mode === 'edit' && editId) {
        // 空のシークレット/トークンは更新しない
        const body: Record<string, string | boolean> = { name: form.name, channel_id: form.channel_id }
        if (form.channel_secret) body.channel_secret = form.channel_secret
        if (form.channel_access_token) body.channel_access_token = form.channel_access_token

        const res = await fetch(`/api/line-channels/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? '更新に失敗しました')
        }
      }
      setMode('list')
      setEditId(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このチャネルを削除しますか？')) return
    try {
      const res = await fetch(`/api/line-channels/${id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        const data = await res.json()
        alert(data.error ?? '削除に失敗しました')
        return
      }
      router.refresh()
    } catch {
      alert('削除に失敗しました')
    }
  }

  const handleToggleActive = async (ch: Channel) => {
    try {
      const res = await fetch(`/api/line-channels/${ch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !ch.is_active }),
      })
      if (res.ok) router.refresh()
    } catch {
      // silent
    }
  }

  const copyWebhookUrl = async (webhookPath: string) => {
    const url = getWebhookUrl(webhookPath)
    await navigator.clipboard.writeText(url)
    setCopied(webhookPath)
    setTimeout(() => setCopied(null), 2000)
  }

  // --- フォーム表示 ---
  if (mode !== 'list') {
    return (
      <Card>
        <CardBody>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {mode === 'create' ? '新規チャネル作成' : 'チャネル編集'}
          </h2>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                事務所名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="例: 東京事務所"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LINE チャネル ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.channel_id}
                onChange={(e) => setForm({ ...form, channel_id: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="LINE Developers Console のチャネル ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                チャネルシークレット {mode === 'create' && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={form.channel_secret}
                  onChange={(e) => setForm({ ...form, channel_secret: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm pr-16 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={mode === 'edit' ? '変更する場合のみ入力' : 'チャネルシークレット'}
                />
                <button
                  type="button"
                  onClick={() => setShowSecrets(!showSecrets)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700"
                >
                  {showSecrets ? '隠す' : '表示'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                チャネルアクセストークン {mode === 'create' && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={form.channel_access_token}
                  onChange={(e) => setForm({ ...form, channel_access_token: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm pr-16 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={mode === 'edit' ? '変更する場合のみ入力' : 'チャネルアクセストークン'}
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? '保存中...' : mode === 'create' ? '作成' : '更新'}
              </Button>
              <Button variant="secondary" onClick={handleCancel} disabled={submitting}>
                キャンセル
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    )
  }

  // --- リスト表示 ---
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleCreate}>新規チャネル追加</Button>
      </div>

      {channels.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-gray-400">チャネルが登録されていません</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {channels.map((ch) => (
            <Card key={ch.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{ch.name}</p>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full ${
                          ch.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {ch.is_active ? '有効' : '無効'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      チャネル ID: {ch.channel_id}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-500 truncate max-w-md">
                        Webhook: {getWebhookUrl(ch.webhook_path)}
                      </p>
                      <button
                        onClick={() => copyWebhookUrl(ch.webhook_path)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 shrink-0"
                      >
                        {copied === ch.webhook_path ? 'OK!' : 'コピー'}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => handleToggleActive(ch)}>
                      {ch.is_active ? '無効化' : '有効化'}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handleEdit(ch)}>
                      編集
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(ch.id)}>
                      削除
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
