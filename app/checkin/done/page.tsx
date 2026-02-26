import { Suspense } from 'react'
import CheckinDoneClient from './CheckinDoneClient'

export default function CheckinDonePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-400">読み込み中...</p>
        </div>
      }
    >
      <CheckinDoneClient />
    </Suspense>
  )
}
