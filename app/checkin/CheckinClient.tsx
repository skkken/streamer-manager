'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import { TemplateField, SelfCheckTemplate } from '@/lib/types'

// ----------------------------------------------------------------
// モード判定
//   テストモード : ?streamerId=xxx&date=YYYY-MM-DD
//   本番モード   : ?t=TOKEN
// ----------------------------------------------------------------

type LoadedData = {
  streamer_id: string
  streamer_name: string
  date: string
  template: SelfCheckTemplate
  already_submitted: boolean
}

type PageStatus =
  | 'loading'
  | 'error'
  | 'already_submitted'
  | 'ready'
  | 'submitting'

export default function CheckinClient() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const token = searchParams.get('t')
  const streamerId = searchParams.get('streamerId')
  const dateParam = searchParams.get('date') ?? ''

  const [status, setStatus] = useState<PageStatus>('loading')
  const [loaded, setLoaded] = useState<LoadedData | null>(null)
  const [answers, setAnswers] = useState<Record<string, boolean | string>>({})
  const [memo, setMemo] = useState('')
  const [diamonds, setDiamonds] = useState<number | ''>('')
  const [errorMsg, setErrorMsg] = useState('')

  // ----------------------------------------------------------------
  // 初期ロード：テンプレ取得 or トークン検証
  // ----------------------------------------------------------------
  useEffect(() => {
    // --- テストモード ---
    if (streamerId) {
      const qs = new URLSearchParams({ streamer_id: streamerId })
      if (dateParam) qs.set('date', dateParam)

      fetch(`/api/checkin/load?${qs}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.error) {
            setErrorMsg(data.error)
            setStatus('error')
            return
          }
          if (data.already_submitted) {
            setStatus('already_submitted')
            return
          }
          setLoaded(data)
          setStatus('ready')
        })
        .catch(() => {
          setErrorMsg('通信エラーが発生しました')
          setStatus('error')
        })
      return
    }

    // --- 本番モード（TOKEN）---
    if (token) {
      fetch('/api/checkin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (!data.valid) {
            setErrorMsg(data.error ?? '無効なURLです')
            setStatus('error')
            return
          }
          if (data.already_submitted) {
            setStatus('already_submitted')
            return
          }
          setLoaded({
            streamer_id: data.streamer_id,
            streamer_name: '',
            date: data.date,
            template: data.template,
            already_submitted: false,
          })
          setStatus('ready')
        })
        .catch(() => {
          setErrorMsg('通信エラーが発生しました')
          setStatus('error')
        })
      return
    }

    // どちらもない
    setErrorMsg('URLが正しくありません。streamerId または t パラメータが必要です。')
    setStatus('error')
  }, [token, streamerId, dateParam])

  // ----------------------------------------------------------------
  // フォーム送信
  // ----------------------------------------------------------------
  const fields: TemplateField[] = loaded?.template?.schema?.fields ?? []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    // requiredバリデーション
    for (const field of fields) {
      if (
        field.required &&
        field.type === 'boolean' &&
        answers[field.key] === undefined
      ) {
        setErrorMsg(`「${field.label}」を選択してください`)
        return
      }
      if (
        field.required &&
        field.type === 'text' &&
        !String(answers[field.key] ?? '').trim()
      ) {
        setErrorMsg(`「${field.label}」を入力してください`)
        return
      }
    }

    if (diamonds === '' || Number(diamonds) < 0) {
      setErrorMsg('当日のダイヤ数を0以上で入力してください')
      return
    }

    setStatus('submitting')

    try {
      let res: Response

      if (token) {
        // 本番：トークンで送信（diamonds + レベル更新を含む）
        res = await fetch('/api/self-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, answers, memo, diamonds: Number(diamonds) }),
        })
      } else {
        // テスト：直接送信
        res = await fetch('/api/checkin/direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            streamer_id: loaded!.streamer_id,
            date: loaded!.date,
            answers,
            memo,
            diamonds: Number(diamonds),
          }),
        })
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '送信に失敗しました')

      // 完了ページへ
      const params = new URLSearchParams({
        type: data.ai_type ?? 'NORMAL',
        comment: data.ai_comment ?? '',
        action: data.ai_next_action ?? '',
        neg: data.ai_negative_detected ? '1' : '0',
        score: String(data.overall_score ?? 0),
      })
      router.push(`/checkin/done?${params.toString()}`)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '送信に失敗しました')
      setStatus('ready')
    }
  }

  // ----------------------------------------------------------------
  // レンダリング
  // ----------------------------------------------------------------

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-sm w-full text-center">
          <p className="text-3xl mb-3">⚠️</p>
          <p className="text-gray-800 font-semibold mb-2">開けませんでした</p>
          <p className="text-sm text-gray-500 leading-relaxed">{errorMsg}</p>
        </div>
      </div>
    )
  }

  if (status === 'already_submitted') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-sm w-full text-center">
          <p className="text-3xl mb-3">✅</p>
          <p className="text-gray-800 font-semibold">本日分は送信済みです</p>
          <p className="text-sm text-gray-400 mt-2">また明日もよろしくお願いします。</p>
        </div>
      </div>
    )
  }

  // フォーム
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

          {/* ヘッダー */}
          <div className="bg-indigo-600 px-6 py-5">
            <h1 className="text-white text-lg font-bold">本日の自己評価</h1>
            <p className="text-indigo-200 text-sm mt-0.5">
              {loaded?.streamer_name && `${loaded.streamer_name} ・ `}
              {loaded?.date}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">

            {/* 今回のダイヤ入力 */}
            <div>
              <p className="text-sm font-medium text-gray-800 mb-2">
                今回のダイヤ数
                <span className="ml-1 text-red-500">*</span>
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={diamonds}
                  onChange={(e) =>
                    setDiamonds(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="例：3000"
                />
                <span className="text-sm text-gray-500 whitespace-nowrap">ダイヤ</span>
              </div>
            </div>

            {/* 質問フィールド（YES/NO + テキスト） */}
            {fields.map((field) => (
              <div key={field.key}>
                <p className="text-sm font-medium text-gray-800 mb-2">
                  {field.label}
                  {field.required && <span className="ml-1 text-red-500">*</span>}
                </p>

                {field.type === 'boolean' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [field.key]: true }))}
                      className={`py-3 rounded-lg border text-sm font-medium transition-all ${
                        answers[field.key] === true
                          ? 'bg-green-500 text-white border-green-500 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-green-400 hover:text-green-600'
                      }`}
                    >
                      ✓ はい
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [field.key]: false }))}
                      className={`py-3 rounded-lg border text-sm font-medium transition-all ${
                        answers[field.key] === false
                          ? 'bg-red-400 text-white border-red-400 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-red-300 hover:text-red-500'
                      }`}
                    >
                      ✕ いいえ
                    </button>
                  </div>
                ) : (
                  <textarea
                    value={(answers[field.key] as string) ?? ''}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder={field.required ? '入力してください' : '任意入力'}
                  />
                )}
              </div>
            ))}

            {/* 全体メモ */}
            <div>
              <p className="text-sm font-medium text-gray-800 mb-2">
                全体メモ
                <span className="ml-1 text-gray-400 font-normal text-xs">（任意）</span>
              </p>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="今日感じたこと、気になることなど"
              />
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-sm text-red-600">{errorMsg}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full py-3 text-base"
              disabled={status === 'submitting'}
            >
              {status === 'submitting' ? '送信中...' : '送信する'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
