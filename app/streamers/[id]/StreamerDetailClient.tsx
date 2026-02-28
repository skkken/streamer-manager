'use client'

import { getJstDateString } from '@/lib/jst'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card, { CardBody } from '@/components/ui/Card'
import { Streamer, SelfCheck, StaffNote, StreamerStatus, StaffNoteStatus, TemplateField } from '@/lib/types'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import React from 'react'

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

const noteStatusVariant: Record<StaffNoteStatus, 'green' | 'yellow' | 'red' | 'gray' | 'indigo' | 'blue'> = {
  preparing: 'gray',
  good: 'green',
  mostly_good: 'blue',
  caution: 'yellow',
  danger: 'red',
}

const noteStatusLabel: Record<StaffNoteStatus, string> = {
  preparing: '準備中',
  good: '順調',
  mostly_good: '概ね順調',
  caution: 'やや危険',
  danger: '危険',
}

type Stats = {
  totalDiamonds: number
  monthDiamonds: number
  checkinRate: number
  latestYes: number | null
  weekYes: number | null
  weekStreamingMinutes: number
  monthStreamingMinutes: number
  totalStreamingMinutes: number
}

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  if (h === 0) return `${min}分`
  if (min === 0) return `${h}時間`
  return `${h}時間${min}分`
}

function pct(v: number | null): string {
  if (v === null) return '—'
  return `${Math.round(v * 100)}%`
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm text-gray-800 text-right">{children}</span>
    </div>
  )
}

function AnswerValue({ val }: { val: boolean | string }) {
  if (val === true) return <span className="font-medium text-green-600">YES</span>
  if (val === false) return <span className="font-medium text-red-500">NO</span>
  return <span className="text-gray-700">{String(val)}</span>
}

export default function StreamerDetailClient({
  streamer,
  checks,
  notes: initialNotes,
  stats,
  templateFields,
  earningsByDate,
}: {
  streamer: Streamer
  checks: SelfCheck[]
  notes: StaffNote[]
  stats: Stats | null
  templateFields: Record<string, TemplateField[]>
  earningsByDate: Record<string, { diamonds: number; streaming_minutes: number }>
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'checks' | 'notes'>('checks')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [expandedCheckId, setExpandedCheckId] = useState<string | null>(null)

  const [notesList, setNotesList] = useState<StaffNote[]>(initialNotes)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [noteForm, setNoteForm] = useState({
    date: getJstDateString(),
    category: '',
    current_state: '',
    action: '',
    next_action: '',
    status: 'preparing' as StaffNoteStatus,
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    date: '',
    category: '',
    current_state: '',
    action: '',
    next_action: '',
    status: 'preparing' as StaffNoteStatus,
  })
  const [updating, setUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  function startEditNote(n: StaffNote) {
    setEditingNoteId(n.id)
    setEditForm({
      date: n.date,
      category: n.category,
      current_state: n.current_state,
      action: n.action,
      next_action: n.next_action,
      status: n.status,
    })
    setUpdateError(null)
  }

  async function handleUpdateNote(e: React.FormEvent) {
    e.preventDefault()
    if (!editingNoteId) return
    setUpdating(true)
    setUpdateError(null)
    try {
      const res = await fetch(`/api/staff-notes/${editingNoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) {
        const text = await res.text()
        let message = '更新に失敗しました'
        try { message = JSON.parse(text).error ?? message } catch (_e) {}
        setUpdateError(message)
        return
      }
      const updated = await res.json()
      setNotesList(notesList.map((n) => (n.id === editingNoteId ? updated : n)))
      setEditingNoteId(null)
    } catch (_e) {
      setUpdateError('更新に失敗しました')
    } finally {
      setUpdating(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`「${streamer.display_name}」を削除しますか？\nこの操作は元に戻せません。`)) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/streamers/${streamer.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const text = await res.text()
        let message = '削除に失敗しました'
        if (text) {
          try { message = JSON.parse(text).error ?? message } catch (_e) {}
        }
        setDeleteError(message)
        return
      }
      router.push('/streamers')
    } catch (_e) {
      setDeleteError('削除に失敗しました')
    } finally {
      setDeleting(false)
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/staff-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...noteForm, streamer_id: streamer.id }),
      })
      if (!res.ok) {
        const text = await res.text()
        let message = '追加に失敗しました'
        try { message = JSON.parse(text).error ?? message } catch (_e) {}
        setSubmitError(message)
        return
      }
      const newNote = await res.json()
      setNotesList([newNote, ...notesList])
      setShowNoteForm(false)
      setNoteForm({
        date: getJstDateString(),
        category: '',
        current_state: '',
        action: '',
        next_action: '',
        status: 'preparing',
      })
    } catch (_e) {
      setSubmitError('追加に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const effectiveLevel = streamer.level_override ?? streamer.level_current ?? null
  const levelLabel = effectiveLevel === null ? '—' : effectiveLevel === 8 ? 'G' : `Lv${effectiveLevel}`

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* プロフィールカード */}
      <div className="col-span-1 space-y-4">
        <Card>
          <CardBody>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{streamer.display_name}</h2>

            <div className="space-y-0">
              <InfoRow label="ステータス">
                <Badge variant={statusVariant[streamer.status]}>
                  {statusLabel[streamer.status]}
                </Badge>
              </InfoRow>
              <InfoRow label="現在のレベル">
                <span className="font-medium">{levelLabel}</span>
              </InfoRow>
              <InfoRow label="事務所名">
                {streamer.agency_name ?? <span className="text-gray-400 text-xs">未設定</span>}
              </InfoRow>
              <InfoRow label="担当者">
                {streamer.manager_name ?? <span className="text-gray-400 text-xs">未設定</span>}
              </InfoRow>
              <InfoRow label="TikTok ID">
                {streamer.tiktok_id ? (
                  <span className="font-mono text-xs">{streamer.tiktok_id}</span>
                ) : (
                  <span className="text-gray-400 text-xs">未設定</span>
                )}
              </InfoRow>
              <InfoRow label="LINE ID">
                <span className="font-mono text-xs truncate max-w-[140px] block">
                  {streamer.line_user_id || <span className="text-gray-400">未設定</span>}
                </span>
              </InfoRow>
              <InfoRow label="通知">
                <Badge variant={streamer.notify_enabled ? 'green' : 'gray'}>
                  {streamer.notify_enabled ? 'ON' : 'OFF'}
                </Badge>
              </InfoRow>
              <InfoRow label="登録日">
                {new Date(streamer.created_at).toLocaleDateString('ja-JP')}
              </InfoRow>
            </div>

            {streamer.notes && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-1">メモ</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{streamer.notes}</p>
              </div>
            )}

            {deleteError && (
              <p className="mt-3 text-xs text-red-600">{deleteError}</p>
            )}

            <div className="mt-4 flex gap-2">
              <Link href={`/streamers/${streamer.id}/edit`} className="flex-1">
                <Button size="sm" variant="secondary" className="w-full">
                  編集
                </Button>
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-3 py-1.5 text-sm font-medium rounded-md border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleting ? '削除中…' : '削除'}
              </button>
            </div>
          </CardBody>
        </Card>

        {/* 統計カード */}
        {stats && (
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">統計</h3>
              <div className="space-y-0">
                <InfoRow label="配信時間（今週）">
                  <span className="font-medium">{formatMinutes(stats.weekStreamingMinutes)}</span>
                </InfoRow>
                <InfoRow label="配信時間（今月）">
                  <span className="font-medium">{formatMinutes(stats.monthStreamingMinutes)}</span>
                </InfoRow>
                <InfoRow label="配信時間（累計）">
                  <span className="font-medium">{formatMinutes(stats.totalStreamingMinutes)}</span>
                </InfoRow>
                <InfoRow label="今月獲得ダイヤ">
                  <span className="font-medium">{stats.monthDiamonds.toLocaleString()}</span>
                </InfoRow>
                <InfoRow label="累計総獲得ダイヤ">
                  <span className="font-medium">{stats.totalDiamonds.toLocaleString()}</span>
                </InfoRow>
                <InfoRow label="回答率（今週）">
                  <span className="font-medium">{pct(stats.checkinRate)}</span>
                </InfoRow>
                <InfoRow label="直近のYES割合">
                  <span className="font-medium">{pct(stats.latestYes)}</span>
                </InfoRow>
                <InfoRow label="今週のYES割合">
                  <span className="font-medium">{pct(stats.weekYes)}</span>
                </InfoRow>
              </div>
            </CardBody>
          </Card>
        )}
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
            自己評価 ({checks.length})
          </button>
          <button
            onClick={() => setTab('notes')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === 'notes'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            担当ノート ({notesList.length})
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
                      <th className="text-left px-4 py-3 text-gray-600">配信時間</th>
                      <th className="text-left px-4 py-3 text-gray-600">ダイヤ</th>
                      <th className="text-left px-4 py-3 text-gray-600">スコア</th>
                      <th className="text-left px-4 py-3 text-gray-600">判定</th>
                      <th className="text-left px-4 py-3 text-gray-600">ネガ</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {checks.map((c) => {
                      const isExpanded = expandedCheckId === c.id
                      const fields = templateFields[c.template_id] ?? []
                      const earning = earningsByDate[c.date]
                      return (
                        <React.Fragment key={c.id}>
                          <tr
                            className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer select-none"
                            onClick={() => setExpandedCheckId(isExpanded ? null : c.id)}
                          >
                            <td className="px-4 py-3 text-gray-700">{c.date}</td>
                            <td className="px-4 py-3 text-gray-700">
                              {earning ? formatMinutes(earning.streaming_minutes) : '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {earning ? earning.diamonds.toLocaleString() : '—'}
                            </td>
                            <td className="px-4 py-3 font-medium">
                              {c.overall_score ?? '—'}
                            </td>
                            <td className="px-4 py-3">
                              {c.ai_type && (
                                <Badge
                                  variant={
                                    c.ai_type === 'VERY_GOOD' || c.ai_type === 'GOOD'
                                      ? 'green'
                                      : c.ai_type === 'VERY_BAD'
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
                            <td className="px-4 py-3 text-gray-400 text-xs text-right">
                              {isExpanded ? '▲' : '▼'}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-indigo-50">
                              <td colSpan={7} className="px-6 py-4">
                                <div className="space-y-3">
                                  {/* 回答一覧 */}
                                  <div className="grid grid-cols-2 gap-x-8 gap-y-0">
                                    {fields.length > 0
                                      ? fields.map((f) => (
                                          <div key={f.key} className="flex items-center justify-between text-xs py-1.5 border-b border-indigo-100">
                                            <span className="text-gray-600">{f.label}</span>
                                            <AnswerValue val={c.answers[f.key] as boolean | string} />
                                          </div>
                                        ))
                                      : Object.entries(c.answers).map(([key, val]) => (
                                          <div key={key} className="flex items-center justify-between text-xs py-1.5 border-b border-indigo-100">
                                            <span className="text-gray-600">{key}</span>
                                            <AnswerValue val={val} />
                                          </div>
                                        ))
                                    }
                                  </div>
                                  {/* メモ */}
                                  {c.memo && (
                                    <div className="text-xs pt-1">
                                      <span className="text-gray-500 font-medium">メモ: </span>
                                      <span className="text-gray-700">{c.memo}</span>
                                    </div>
                                  )}
                                  {/* AIコメント */}
                                  {c.ai_comment && (
                                    <div className="text-xs">
                                      <span className="text-gray-500 font-medium">AIコメント: </span>
                                      <span className="text-gray-700">{c.ai_comment}</span>
                                    </div>
                                  )}
                                  {c.ai_next_action && (
                                    <div className="text-xs">
                                      <span className="text-gray-500 font-medium">次のアクション: </span>
                                      <span className="text-gray-700">{c.ai_next_action}</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {tab === 'notes' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button
                size="sm"
                variant={showNoteForm ? 'secondary' : 'primary'}
                onClick={() => {
                  setShowNoteForm(!showNoteForm)
                  setSubmitError(null)
                }}
              >
                {showNoteForm ? 'キャンセル' : '+ ノート追加'}
              </Button>
            </div>

            {showNoteForm && (
              <Card>
                <CardBody>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">面談ノート追加</h4>
                  <form onSubmit={handleAddNote} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">日付</label>
                        <input
                          type="date"
                          value={noteForm.date}
                          onChange={(e) => setNoteForm({ ...noteForm, date: e.target.value })}
                          required
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">ステータス</label>
                        <select
                          value={noteForm.status}
                          onChange={(e) => setNoteForm({ ...noteForm, status: e.target.value as StaffNoteStatus })}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="preparing">準備中</option>
                          <option value="good">順調</option>
                          <option value="mostly_good">概ね順調</option>
                          <option value="caution">やや危険</option>
                          <option value="danger">危険</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">カテゴリ</label>
                      <input
                        type="text"
                        value={noteForm.category}
                        onChange={(e) => setNoteForm({ ...noteForm, category: e.target.value })}
                        placeholder="例: 面談, フォローアップ, 警告"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">現在の状況</label>
                      <textarea
                        value={noteForm.current_state}
                        onChange={(e) => setNoteForm({ ...noteForm, current_state: e.target.value })}
                        rows={2}
                        placeholder="現在の配信状況や課題など"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">実施アクション</label>
                      <textarea
                        value={noteForm.action}
                        onChange={(e) => setNoteForm({ ...noteForm, action: e.target.value })}
                        rows={2}
                        placeholder="面談で行ったこと・伝えたこと"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">次のアクション</label>
                      <textarea
                        value={noteForm.next_action}
                        onChange={(e) => setNoteForm({ ...noteForm, next_action: e.target.value })}
                        rows={2}
                        placeholder="次回までに行うこと・フォロー事項"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                    </div>
                    {submitError && (
                      <p className="text-xs text-red-600">{submitError}</p>
                    )}
                    <div className="flex justify-end">
                      <Button type="submit" size="sm" disabled={submitting}>
                        {submitting ? '保存中…' : '保存'}
                      </Button>
                    </div>
                  </form>
                </CardBody>
              </Card>
            )}

            <Card>
              {notesList.length === 0 ? (
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
                        <th className="text-left px-4 py-3 text-gray-600">状況</th>
                        <th className="text-left px-4 py-3 text-gray-600">アクション</th>
                        <th className="text-left px-4 py-3 text-gray-600">ステータス</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {notesList.map((n) => (
                        <React.Fragment key={n.id}>
                          {editingNoteId === n.id ? (
                            <tr className="border-b border-gray-100 bg-amber-50">
                              <td colSpan={6} className="px-4 py-4">
                                <form onSubmit={handleUpdateNote} className="space-y-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">日付</label>
                                      <input
                                        type="date"
                                        value={editForm.date}
                                        onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                        required
                                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">ステータス</label>
                                      <select
                                        value={editForm.status}
                                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value as StaffNoteStatus })}
                                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                      >
                                        <option value="preparing">準備中</option>
                                        <option value="good">順調</option>
                                        <option value="mostly_good">概ね順調</option>
                                        <option value="caution">やや危険</option>
                                        <option value="danger">危険</option>
                                      </select>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">カテゴリ</label>
                                    <input
                                      type="text"
                                      value={editForm.category}
                                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">現在の状況</label>
                                    <textarea
                                      value={editForm.current_state}
                                      onChange={(e) => setEditForm({ ...editForm, current_state: e.target.value })}
                                      rows={2}
                                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">実施アクション</label>
                                    <textarea
                                      value={editForm.action}
                                      onChange={(e) => setEditForm({ ...editForm, action: e.target.value })}
                                      rows={2}
                                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">次のアクション</label>
                                    <textarea
                                      value={editForm.next_action}
                                      onChange={(e) => setEditForm({ ...editForm, next_action: e.target.value })}
                                      rows={2}
                                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                    />
                                  </div>
                                  {updateError && (
                                    <p className="text-xs text-red-600">{updateError}</p>
                                  )}
                                  <div className="flex gap-2 justify-end">
                                    <Button type="button" size="sm" variant="secondary" onClick={() => setEditingNoteId(null)}>
                                      キャンセル
                                    </Button>
                                    <Button type="submit" size="sm" disabled={updating}>
                                      {updating ? '保存中…' : '保存'}
                                    </Button>
                                  </div>
                                </form>
                              </td>
                            </tr>
                          ) : (
                            <tr className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{n.date}</td>
                              <td className="px-4 py-3 text-gray-700">{n.category}</td>
                              <td className="px-4 py-3 text-gray-600 text-xs max-w-[160px]">
                                <p className="line-clamp-2">{n.current_state}</p>
                              </td>
                              <td className="px-4 py-3 text-gray-600 text-xs max-w-[160px]">
                                <p className="line-clamp-2">{n.action}</p>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant={noteStatusVariant[n.status]}>{noteStatusLabel[n.status]}</Badge>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => startEditNote(n)}
                                  className="text-xs text-indigo-600 hover:text-indigo-800"
                                >
                                  修正
                                </button>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
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
