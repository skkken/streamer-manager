'use client'

import { useState } from 'react'
import Card, { CardHeader, CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

type MessageSettings = Record<string, string>

const AI_TYPES = [
  { key: 'very_good', label: '絶好調（VERY_GOOD）' },
  { key: 'good',      label: '好調（GOOD）' },
  { key: 'normal',    label: '普通（NORMAL）' },
  { key: 'bad',       label: '要改善（BAD）' },
  { key: 'very_bad',  label: '要サポート（VERY_BAD）' },
]

const SECTIONS = [
  {
    title: 'LINEサンクスメッセージ（チェックイン後に送信）',
    note: '配信者がチェックインフォームを送信したあと、LINE に自動送信されるお礼メッセージです。VERY_GOOD は GOOD と同じキーを使用、BAD/VERY_BAD は support キーを使用します。',
    fields: [
      { key: 'line_thanks_good',    label: '好調〜絶好調時（GOOD / VERY_GOOD）' },
      { key: 'line_thanks_normal',  label: '普通時（NORMAL）' },
      { key: 'line_thanks_support', label: '要改善〜サポート時（BAD / VERY_BAD）' },
    ],
  },
  {
    title: '完了ページ — フィードバックコメント',
    note: 'チェックイン送信後の完了ページに表示されるフィードバック文です。',
    fields: AI_TYPES.map(({ key, label }) => ({ key: `done_comment_${key}`, label })),
  },
  {
    title: '完了ページ — 次の一手（配信前の準備が弱点）',
    note: 'pre_ キーの質問でNOが多い場合に表示されます。',
    fields: AI_TYPES.map(({ key, label }) => ({ key: `done_action_${key}_pre`, label })),
  },
  {
    title: '完了ページ — 次の一手（配信中が弱点）',
    note: 'live_ キーの質問でNOが多い場合に表示されます。',
    fields: AI_TYPES.map(({ key, label }) => ({ key: `done_action_${key}_live`, label })),
  },
  {
    title: '完了ページ — 次の一手（配信後の振り返りが弱点）',
    note: 'post_ キーの質問でNOが多い場合に表示されます。',
    fields: AI_TYPES.map(({ key, label }) => ({ key: `done_action_${key}_post`, label })),
  },
  {
    title: '完了ページ — その他',
    note: '完了ページ下部に表示される固定文言です。',
    fields: [
      { key: 'done_negative_supplement', label: 'ネガティブ検出時の補足文' },
      { key: 'done_footer', label: 'フッターテキスト' },
    ],
  },
  {
    title: 'LINE登録メッセージ（友だち追加時の会話フロー）',
    note: '配信者がLINEで友だち追加した際に、登録情報を順番に聞く自動メッセージです。',
    fields: [
      { key: 'line_reg_welcome', label: '初回メッセージ（名前を聞く）' },
      { key: 'line_reg_ask_tiktok', label: 'TikTok ID を聞く' },
      { key: 'line_reg_ask_office', label: '所属事務所を聞く' },
      { key: 'line_reg_done', label: '登録完了メッセージ' },
    ],
  },
  {
    title: '配信終了コマンド（LINE → セルフチェック誘導）',
    note: '配信者がLINEでキーワードを送信すると、自己評価フォームのURLを返します。返信メッセージ内の {url} がチェックインURLに置換されます。',
    fields: [
      { key: 'line_stream_end_keyword', label: 'トリガーキーワード' },
      { key: 'line_stream_end_reply', label: '返信メッセージ（{url} = チェックインURL）' },
      { key: 'line_checkin_reminder', label: 'リマインドメッセージ（{name} = 名前, {url} = URL）' },
    ],
  },
]

export default function MessagesClient({ initial }: { initial: MessageSettings }) {
  const [values, setValues] = useState<MessageSettings>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const body = Object.entries(values).map(([key, value]) => ({ key, value }))
      const res = await fetch('/api/message-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? '保存に失敗しました')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 保存ボタン（上部） */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : 'すべて保存'}
        </Button>
        {saved && <span className="text-sm text-green-600">✓ 保存しました</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      {SECTIONS.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <h2 className="font-semibold text-gray-800">{section.title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{section.note}</p>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {section.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                  </label>
                  <textarea
                    value={values[field.key] ?? ''}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    rows={3}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y font-mono"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">key: {field.key}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      ))}

      {/* 保存ボタン（下部） */}
      <div className="flex items-center gap-3 pb-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : 'すべて保存'}
        </Button>
        {saved && <span className="text-sm text-green-600">✓ 保存しました</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  )
}
