'use client'

import { useSearchParams } from 'next/navigation'
import { AiType } from '@/lib/types'
import { NEGATIVE_SUPPLEMENT } from '@/lib/ai'

const headerColor: Record<AiType, string> = {
  GOOD: 'bg-green-500',
  NORMAL: 'bg-indigo-600',
  SUPPORT: 'bg-orange-500',
}

const feedbackBg: Record<AiType, string> = {
  GOOD: 'bg-green-50 border-green-200',
  NORMAL: 'bg-indigo-50 border-indigo-200',
  SUPPORT: 'bg-orange-50 border-orange-200',
}

const feedbackTitle: Record<AiType, string> = {
  GOOD: '今日のフィードバック',
  NORMAL: '今日のフィードバック',
  SUPPORT: '今日のフィードバック',
}

const scoreLabel: Record<AiType, string> = {
  GOOD: '好調',
  NORMAL: '普通',
  SUPPORT: '要サポート',
}

const scoreBadge: Record<AiType, string> = {
  GOOD: 'bg-green-100 text-green-700',
  NORMAL: 'bg-indigo-100 text-indigo-700',
  SUPPORT: 'bg-orange-100 text-orange-700',
}

export default function CheckinDoneClient() {
  const params = useSearchParams()
  const aiType = (params.get('type') ?? 'NORMAL') as AiType
  const comment = params.get('comment') ?? ''
  const action = params.get('action') ?? ''
  const negDetected = params.get('neg') === '1'
  const score = params.get('score') ?? null

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
            {negDetected && aiType === 'SUPPORT' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                <p className="text-sm text-yellow-800 leading-relaxed">
                  {NEGATIVE_SUPPLEMENT}
                </p>
              </div>
            )}

            <p className="text-xs text-gray-400 text-center pt-1">
              お疲れさまでした。このページは閉じて大丈夫です。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
