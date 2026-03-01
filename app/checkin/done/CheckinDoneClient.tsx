'use client'

import { useSearchParams } from 'next/navigation'
import { AiType } from '@/lib/types'

const headerColor: Record<AiType, string> = {
  VERY_GOOD: 'bg-emerald-500',
  GOOD: 'bg-green-500',
  NORMAL: 'bg-indigo-600',
  BAD: 'bg-amber-500',
  VERY_BAD: 'bg-orange-500',
}

const feedbackBg: Record<AiType, string> = {
  VERY_GOOD: 'bg-emerald-50 border-emerald-200',
  GOOD: 'bg-green-50 border-green-200',
  NORMAL: 'bg-indigo-50 border-indigo-200',
  BAD: 'bg-amber-50 border-amber-200',
  VERY_BAD: 'bg-orange-50 border-orange-200',
}

const scoreLabel: Record<AiType, string> = {
  VERY_GOOD: '絶好調',
  GOOD: '好調',
  NORMAL: '普通',
  BAD: '要改善',
  VERY_BAD: '要サポート',
}

const scoreBadge: Record<AiType, string> = {
  VERY_GOOD: 'bg-emerald-100 text-emerald-700',
  GOOD: 'bg-green-100 text-green-700',
  NORMAL: 'bg-indigo-100 text-indigo-700',
  BAD: 'bg-amber-100 text-amber-700',
  VERY_BAD: 'bg-orange-100 text-orange-700',
}

export default function CheckinDoneClient({
  negativeSupplement,
  footer,
}: {
  negativeSupplement: string
  footer: string
}) {
  const params = useSearchParams()
  const isDayOff = params.get('dayoff') === '1'
  const aiType = (params.get('type') ?? 'NORMAL') as AiType
  const comment = params.get('comment') ?? ''
  const action = params.get('action') ?? ''
  const negDetected = params.get('neg') === '1'
  const score = params.get('score') ?? null

  if (isDayOff) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-amber-500 px-6 py-6 text-center">
              <div className="text-4xl mb-2">✓</div>
              <h1 className="text-white text-xl font-bold">休み登録完了</h1>
              <p className="text-white/80 text-sm mt-1">本日の休みを登録しました</p>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-4 text-center">
                <p className="text-sm text-gray-800 leading-relaxed">
                  ゆっくり休んで、また次回の配信に備えましょう。
                </p>
              </div>
              <p className="text-xs text-gray-400 text-center pt-1">{footer}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

          {/* ヘッダー */}
          <div className={`${headerColor[aiType]} px-6 py-6 text-center`}>
            <div className="text-4xl mb-2">✓</div>
            <h1 className="text-white text-xl font-bold">送信完了</h1>
            <p className="text-white/80 text-sm mt-1">自己評価を受け付けました</p>
          </div>

          <div className="px-6 py-6 space-y-4">

            {/* スコア表示 */}
            {score !== null && (
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                <span className="text-sm text-gray-600">本日のスコア</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-800">{score}</span>
                  <span className="text-sm text-gray-400">/ 100</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${scoreBadge[aiType]}`}>
                    {scoreLabel[aiType]}
                  </span>
                </div>
              </div>
            )}

            {/* フィードバック */}
            <div className={`border rounded-lg px-4 py-4 ${feedbackBg[aiType]}`}>
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                今日のフィードバック
              </p>
              <p className="text-sm text-gray-800 leading-relaxed">{comment}</p>
            </div>

            {/* 次の一手 */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-4">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                次の一手
              </p>
              <p className="text-sm text-gray-800 leading-relaxed">{action}</p>
            </div>

            {/* ネガ補足 */}
            {negDetected && (aiType === 'VERY_BAD' || aiType === 'BAD') && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                <p className="text-sm text-yellow-800 leading-relaxed">{negativeSupplement}</p>
              </div>
            )}

            <p className="text-xs text-gray-400 text-center pt-1">{footer}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
