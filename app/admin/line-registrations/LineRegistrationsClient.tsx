'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card, { CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

type Registration = {
  id: string
  line_user_id: string
  line_display_name: string | null
  status: 'pending' | 'registered'
  step: 'ask_name' | 'ask_tiktok' | 'ask_office' | 'done' | null
  input_name: string | null
  tiktok_id: string | null
  office_name: string | null
  line_channel_id: string | null
  created_at: string
}

const STEP_LABEL: Record<string, string> = {
  ask_name: '名前入力待ち',
  ask_tiktok: 'TikTok ID入力待ち',
  ask_office: '事務所名入力待ち',
  done: '入力完了',
}

export default function LineRegistrationsClient({
  registrations,
}: {
  registrations: Registration[]
}) {
  const router = useRouter()
  const [openId, setOpenId] = useState<string | null>(null)
  const [form, setForm] = useState({ display_name: '', tiktok_id: '', line_channel_id: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const pending = registrations.filter((r) => r.status === 'pending')

  const openForm = (reg: Registration) => {
    setOpenId(reg.id)
    setForm({
      display_name: reg.input_name ?? reg.line_display_name ?? '',
      tiktok_id: reg.tiktok_id ?? '',
      line_channel_id: reg.line_channel_id ?? '',
    })
    setError('')
  }

  const handleRegister = async (id: string) => {
    if (!form.display_name.trim()) {
      setError('名前を入力してください')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/line/registrations/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: form.display_name,
          tiktok_id: form.tiktok_id || null,
          line_channel_id: form.line_channel_id || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '登録に失敗しました')
      }
      setOpenId(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '登録に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この登録待ちを削除しますか？')) return
    setDeleting(id)
    try {
      await fetch(`/api/line/registrations/${id}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setDeleting(null)
    }
  }

  if (pending.length === 0) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-gray-400">登録待ちはありません</p>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {pending.map((reg) => {
        const isDone = reg.step === 'done' || reg.step === null
        const stepLabel = reg.step ? STEP_LABEL[reg.step] ?? reg.step : '入力完了'

        return (
          <Card key={reg.id}>
            <CardBody>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800">
                      {reg.input_name ?? reg.line_display_name ?? '（名前取得不可）'}
                    </p>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        isDone
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {stepLabel}
                    </span>
                  </div>
                  {reg.tiktok_id && (
                    <p className="text-xs text-gray-500">TikTok: {reg.tiktok_id}</p>
                  )}
                  <p className="text-xs text-gray-400">LINE ID: {reg.line_user_id}</p>
                  <p className="text-xs text-gray-400">
                    登録日時: {new Date(reg.created_at).toLocaleString('ja-JP')}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => openForm(reg)}
                    disabled={openId === reg.id || !isDone}
                    title={!isDone ? 'ユーザーの入力が完了するまで登録できません' : undefined}
                  >
                    配信者登録
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(reg.id)}
                    disabled={deleting === reg.id}
                  >
                    {deleting === reg.id ? '削除中...' : '削除'}
                  </Button>
                </div>
              </div>

              {openId === reg.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      名前 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.display_name}
                      onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="例: 田中サクラ"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      TikTok ID
                    </label>
                    <input
                      type="text"
                      value={form.tiktok_id}
                      onChange={(e) => setForm({ ...form, tiktok_id: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="@username"
                    />
                  </div>
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleRegister(reg.id)}
                      disabled={submitting}
                    >
                      {submitting ? '登録中...' : '登録する'}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => { setOpenId(null); setError('') }}
                      disabled={submitting}
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        )
      })}
    </div>
  )
}
