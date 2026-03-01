'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import Button from '@/components/ui/Button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 px-4">
      <h2 className="text-lg font-semibold text-gray-800">
        エラーが発生しました
      </h2>
      <p className="text-sm text-gray-600">
        問題が解決しない場合は管理者にお問い合わせください。
      </p>
      <Button onClick={reset}>再試行</Button>
    </div>
  )
}
