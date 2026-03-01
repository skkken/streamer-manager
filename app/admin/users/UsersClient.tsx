'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card, { CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

type Channel = { id: string; name: string }

type UserItem = {
  id: string
  email: string
  role: string
  channels: Channel[]
  created_at: string
}

type FormData = {
  email: string
  role: 'admin' | 'staff'
  channel_ids: string[]
}

const emptyForm: FormData = {
  email: '',
  role: 'staff',
  channel_ids: [],
}

export default function UsersClient({
  users,
  allChannels,
}: {
  users: UserItem[]
  allChannels: Channel[]
}) {
  const router = useRouter()
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = () => {
    setMode('create')
    setEditId(null)
    setForm(emptyForm)
    setError('')
  }

  const handleEdit = (u: UserItem) => {
    setMode('edit')
    setEditId(u.id)
    setForm({
      email: u.email,
      role: u.role as 'admin' | 'staff',
      channel_ids: u.channels.map(c => c.id),
    })
    setError('')
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
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.email,
            role: form.role,
            channel_ids: form.role === 'staff' ? form.channel_ids : [],
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? '作成に失敗しました')
        }
      } else if (mode === 'edit' && editId) {
        const res = await fetch(`/api/admin/users/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: form.role,
            channel_ids: form.role === 'staff' ? form.channel_ids : [],
          }),
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
    if (!confirm('このユーザーを削除しますか？')) return
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
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

  const toggleChannel = (channelId: string) => {
    setForm(prev => ({
      ...prev,
      channel_ids: prev.channel_ids.includes(channelId)
        ? prev.channel_ids.filter(id => id !== channelId)
        : [...prev.channel_ids, channelId],
    }))
  }

  // --- フォーム表示 ---
  if (mode !== 'list') {
    return (
      <Card>
        <CardBody>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {mode === 'create' ? 'ユーザー招待' : 'ユーザー編集'}
          </h2>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                disabled={mode === 'edit'}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="user@example.com"
              />
            </div>

            {mode === 'create' && (
              <p className="text-sm text-gray-500 bg-blue-50 border border-blue-200 rounded px-3 py-2">
                招待メールが送信されます。受信者はメール内のリンクからパスワードを設定し、ログインできるようになります。
              </p>
            )}

            {mode === 'edit' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ロール
                </label>
                <select
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value as 'admin' | 'staff' })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="staff">staff（チャネル制限あり）</option>
                  <option value="admin">admin（全チャネル閲覧可）</option>
                </select>
              </div>
            )}

            {form.role === 'staff' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  閲覧可能チャネル
                </label>
                {allChannels.length === 0 ? (
                  <p className="text-sm text-gray-400">チャネルが登録されていません</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded p-3">
                    {allChannels.map(ch => (
                      <label key={ch.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.channel_ids.includes(ch.id)}
                          onChange={() => toggleChannel(ch.id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">{ch.name}</span>
                      </label>
                    ))}
                  </div>
                )}
                {form.channel_ids.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    チャネルが未選択の場合、配信者は表示されません
                  </p>
                )}
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? '送信中...' : mode === 'create' ? '招待メールを送信' : '更新'}
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
        <Button onClick={handleCreate}>ユーザーを招待</Button>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-gray-400">ユーザーが登録されていません</p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">メール</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">ロール</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">チャネル</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">作成日</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {u.role === 'admin' ? (
                        <span className="text-xs text-gray-400">全チャネル</span>
                      ) : u.channels.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {u.channels.map(ch => (
                            <span
                              key={ch.id}
                              className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                            >
                              {ch.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-amber-500">未設定</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(u.created_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="secondary" onClick={() => handleEdit(u)}>
                          編集
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleDelete(u.id)}>
                          削除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
