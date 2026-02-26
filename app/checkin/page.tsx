import { Suspense } from 'react'
import CheckinClient from './CheckinClient'

export default function CheckinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-500">読み込み中...</p>
        </div>
      }
    >
      <CheckinClient />
    </Suspense>
  )
}
