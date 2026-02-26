'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NotifyToggle({
  streamerId,
  enabled,
}: {
  streamerId: string
  enabled: boolean
}) {
  const router = useRouter()
  const [current, setCurrent] = useState(enabled)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    setLoading(true)
    const next = !current
    try {
      const res = await fetch(`/api/streamers/${streamerId}/notify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notify_enabled: next }),
      })
      if (res.ok) {
        setCurrent(next)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
        current ? 'bg-indigo-600' : 'bg-gray-200'
      }`}
      title={current ? '通知ON → クリックでOFF' : '通知OFF → クリックでON'}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          current ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
