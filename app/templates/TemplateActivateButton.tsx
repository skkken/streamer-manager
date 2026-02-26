'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function TemplateActivateButton({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const activate = async () => {
    setLoading(true)
    await fetch(`/api/templates/${id}/activate`, { method: 'POST' })
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={activate}
      disabled={loading}
      className="text-indigo-600 hover:text-indigo-800 text-sm disabled:opacity-50"
    >
      {loading ? '処理中...' : '有効化'}
    </button>
  )
}
