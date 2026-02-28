'use client'

import Button from '@/components/ui/Button'
import Card, { CardBody } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const MAX_FIELDS = 50

type FieldRow = {
  label: string
  required: boolean
}

function makeKey(index: number) {
  return `q${String(index + 1).padStart(2, '0')}`
}

const LEVEL_LABELS: Record<number, string> = {
  1: 'Lv1',
  2: 'Lv2',
  3: 'Lv3',
  4: 'Lv4',
  5: 'Lv5',
  6: 'Lv6',
  7: 'Lv7',
  8: 'G',
}

export default function NewTemplateForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [forLevel, setForLevel] = useState(1)
  const [fields, setFields] = useState<FieldRow[]>([{ label: '', required: true }])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const addField = () => {
    if (fields.length >= MAX_FIELDS) return
    setFields((prev) => [...prev, { label: '', required: false }])
  }

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index))
  }

  const updateField = (index: number, patch: Partial<FieldRow>) => {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('テンプレ名を入力してください')
      return
    }
    if (fields.length === 0) {
      setError('質問を1つ以上追加してください')
      return
    }
    const emptyLabel = fields.findIndex((f) => !f.label.trim())
    if (emptyLabel !== -1) {
      setError(`質問 ${emptyLabel + 1} のラベルを入力してください`)
      return
    }

    const schema = {
      fields: fields.map((f, i) => ({
        key: makeKey(i),
        label: f.label.trim(),
        type: 'boolean',
        required: f.required,
      })),
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), for_level: forLevel, schema_json: JSON.stringify(schema) }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '作成に失敗しました')
      }
      router.push('/templates')
    } catch (err) {
      setError(err instanceof Error ? err.message : '作成に失敗しました')
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* 基本情報 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  テンプレ名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="例: 標準テンプレ v2"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  対象レベル <span className="text-red-500">*</span>
                </label>
                <select
                  value={forLevel}
                  onChange={(e) => setForLevel(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Object.entries(LEVEL_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* YES/NO 質問リスト */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  YES / NO 質問
                  <span className="ml-2 text-xs text-gray-400 font-normal">
                    ({fields.length} / {MAX_FIELDS})
                  </span>
                </label>
              </div>

              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <span className="text-xs text-gray-400 w-6 shrink-0 text-right">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateField(index, { label: e.target.value })}
                      className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="質問文を入力"
                    />
                    <label className="flex items-center gap-1 text-xs text-gray-600 shrink-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(index, { required: e.target.checked })}
                        className="rounded"
                      />
                      必須
                    </label>
                    <button
                      type="button"
                      onClick={() => removeField(index)}
                      disabled={fields.length === 1}
                      className="text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-lg leading-none shrink-0"
                      aria-label="削除"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addField}
                disabled={fields.length >= MAX_FIELDS}
                className="mt-3 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                + 質問を追加
                {fields.length >= MAX_FIELDS && ` (上限 ${MAX_FIELDS} 個)`}
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? '作成中...' : '作成する'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push('/templates')}
              >
                キャンセル
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
