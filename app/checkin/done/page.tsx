import { Suspense } from 'react'
import { getMessageSettings } from '@/lib/messages'
import CheckinDoneClient from './CheckinDoneClient'

export default async function CheckinDonePage() {
  const messages = await getMessageSettings()
  const negativeSupplement = messages.done_negative_supplement
  const footer = messages.done_footer

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-400">読み込み中...</p>
        </div>
      }
    >
      <CheckinDoneClient negativeSupplement={negativeSupplement} footer={footer} />
    </Suspense>
  )
}
