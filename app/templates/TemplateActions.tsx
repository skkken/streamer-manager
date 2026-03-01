'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

export default function TemplateActions({
  id,
  name,
  isActive,
}: {
  id: string
  name: string
  isActive: boolean
}) {
  const router = useRouter()
  const [activating, setActivating] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleActivate = async () => {
    setActivating(true)
    setError(null)
    try {
      await fetch(`/api/templates/${id}/activate`, { method: 'POST' })
      router.refresh()
    } catch {
      setError('有効化に失敗しました')
    } finally {
      setActivating(false)
    }
  }

  const handleDeactivate = async () => {
    setDeactivating(true)
    setError(null)
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      })
      if (!res.ok) {
        const text = await res.text()
        let message = '無効化に失敗しました'
        try { message = JSON.parse(text).error ?? message } catch {}
        setError(message)
        return
      }
      router.refresh()
    } catch {
      setError('無効化に失敗しました')
    } finally {
      setDeactivating(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`「${name}」を削除しますか？`)) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const text = await res.text()
        let message = '削除に失敗しました'
        if (text) {
          try { message = JSON.parse(text).error ?? message } catch {}
        }
        setError(message)
        return
      }
      router.refresh()
    } catch {
      setError('削除に失敗しました')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error && (
        <span className="text-xs text-red-600 max-w-[200px] text-right">{error}</span>
      )}
      {isActive ? (
        <button
          onClick={handleDeactivate}
          disabled={deactivating}
          className="px-3 py-1.5 text-xs font-medium rounded border border-yellow-300 text-yellow-700 hover:bg-yellow-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {deactivating ? '処理中…' : '無効にする'}
        </button>
      ) : (
        <button
          onClick={handleActivate}
          disabled={activating}
          className="px-3 py-1.5 text-xs font-medium rounded border border-indigo-300 text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {activating ? '処理中…' : '有効にする'}
        </button>
      )}
      <Link
        href={`/templates/${id}/edit`}
        className="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
      >
        修正
      </Link>
      <button
        onClick={handleDelete}
        disabled={deleting || isActive}
        title={isActive ? 'アクティブなテンプレートは削除できません' : '削除'}
        className="px-3 py-1.5 text-xs font-medium rounded border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {deleting ? '削除中…' : '削除'}
      </button>
    </div>
  )
}
