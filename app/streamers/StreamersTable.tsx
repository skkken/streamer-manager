'use client'

import Badge from '@/components/ui/Badge'
import NotifyToggle from '@/components/ui/NotifyToggle'
import Card from '@/components/ui/Card'
import Link from 'next/link'
import { useState, useMemo } from 'react'
import { Streamer, StreamerStatus, StaffNoteStatus } from '@/lib/types'

export type StreamerRow = Streamer & {
  totalDiamonds: number
  monthDiamonds: number
  checkinRate: number
  weekYes: number | null
  latestNoteStatus: StaffNoteStatus | null
}

const noteStatusVariant: Record<StaffNoteStatus, 'green' | 'yellow' | 'red' | 'gray' | 'blue'> = {
  preparing: 'gray',
  good: 'green',
  mostly_good: 'blue',
  caution: 'yellow',
  danger: 'red',
}

const noteStatusLabel: Record<StaffNoteStatus, string> = {
  preparing: '準備中',
  good: '順調',
  mostly_good: '概ね順調',
  caution: 'やや危険',
  danger: '危険',
}

const statusLabel: Record<StreamerStatus, string> = {
  active: 'アクティブ',
  paused: '一時停止',
  graduated: '卒業',
  dropped: '離脱',
}
const statusVariant: Record<StreamerStatus, 'green' | 'yellow' | 'gray' | 'red'> = {
  active: 'green',
  paused: 'yellow',
  graduated: 'gray',
  dropped: 'red',
}

function pct(v: number | null): string {
  if (v === null) return '—'
  return `${Math.round(v * 100)}%`
}

type SortKey = 'monthDiamonds' | 'totalDiamonds' | 'checkinRate' | 'weekYes'

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  return (
    <span className={`ml-1 text-xs ${active ? 'text-indigo-600' : 'text-gray-300'}`}>
      {active ? (dir === 'asc' ? '▲' : '▼') : '▲▼'}
    </span>
  )
}

export default function StreamersTable({ streamers }: { streamers: StreamerRow[] }) {
  const [agencyFilter, setAgencyFilter] = useState('__all__')
  const [managerFilter, setManagerFilter] = useState('__all__')
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const agencies = useMemo(() => {
    const set = new Set<string>()
    for (const s of streamers) {
      if (s.agency_name) set.add(s.agency_name)
    }
    return Array.from(set).sort()
  }, [streamers])

  const managers = useMemo(() => {
    const set = new Set<string>()
    for (const s of streamers) {
      if (s.manager_name) set.add(s.manager_name)
    }
    return Array.from(set).sort()
  }, [streamers])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const rows = useMemo(() => {
    let list =
      agencyFilter === '__all__'
        ? streamers
        : agencyFilter === '__none__'
        ? streamers.filter((s) => !s.agency_name)
        : streamers.filter((s) => s.agency_name === agencyFilter)

    if (managerFilter !== '__all__') {
      list =
        managerFilter === '__none__'
          ? list.filter((s) => !s.manager_name)
          : list.filter((s) => s.manager_name === managerFilter)
    }

    if (sortKey) {
      list = [...list].sort((a, b) => {
        const av = a[sortKey] ?? -1
        const bv = b[sortKey] ?? -1
        return sortDir === 'asc' ? av - bv : bv - av
      })
    }
    return list
  }, [streamers, agencyFilter, managerFilter, sortKey, sortDir])

  return (
    <>
      {/* フィルター */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <label className="text-sm text-gray-500 shrink-0">事務所:</label>
        <select
          value={agencyFilter}
          onChange={(e) => setAgencyFilter(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="__all__">すべて</option>
          {agencies.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
          <option value="__none__">未設定</option>
        </select>
        <label className="text-sm text-gray-500 shrink-0">担当者:</label>
        <select
          value={managerFilter}
          onChange={(e) => setManagerFilter(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="__all__">すべて</option>
          {managers.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
          <option value="__none__">未設定</option>
        </select>
        <span className="text-xs text-gray-400">{rows.length} 件</span>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-gray-600 font-medium">名前</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">ステータス</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">レベル</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">事務所</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">担当者</th>
                <th
                  className="text-right px-4 py-3 text-gray-600 font-medium cursor-pointer select-none hover:text-indigo-600"
                  onClick={() => handleSort('monthDiamonds')}
                >
                  今月ダイヤ
                  <SortIcon active={sortKey === 'monthDiamonds'} dir={sortDir} />
                </th>
                <th
                  className="text-right px-4 py-3 text-gray-600 font-medium cursor-pointer select-none hover:text-indigo-600"
                  onClick={() => handleSort('totalDiamonds')}
                >
                  累計ダイヤ
                  <SortIcon active={sortKey === 'totalDiamonds'} dir={sortDir} />
                </th>
                <th
                  className="text-right px-4 py-3 text-gray-600 font-medium cursor-pointer select-none hover:text-indigo-600"
                  onClick={() => handleSort('checkinRate')}
                >
                  チェックイン回答率(今週)
                  <SortIcon active={sortKey === 'checkinRate'} dir={sortDir} />
                </th>
                <th
                  className="text-right px-4 py-3 text-gray-600 font-medium cursor-pointer select-none hover:text-indigo-600"
                  onClick={() => handleSort('weekYes')}
                >
                  今週YES割合
                  <SortIcon active={sortKey === 'weekYes'} dir={sortDir} />
                </th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">通知</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.display_name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[s.status]}>{statusLabel[s.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    Lv{s.level_override ?? s.level_current ?? 0}
                    {s.level_override !== null && s.level_override !== undefined && (
                      <span className="ml-1 text-xs text-indigo-400">※</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {s.agency_name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    <div className="flex flex-col gap-1">
                      <span>{s.manager_name ?? <span className="text-gray-300">—</span>}</span>
                      {s.latestNoteStatus && (
                        <Badge variant={noteStatusVariant[s.latestNoteStatus]}>
                          {noteStatusLabel[s.latestNoteStatus]}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {s.monthDiamonds.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {s.totalDiamonds.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {pct(s.checkinRate)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {pct(s.weekYes)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <NotifyToggle streamerId={s.id} enabled={s.notify_enabled} />
                      <span className="text-xs text-gray-500">
                        {s.notify_enabled ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/streamers/${s.id}`}
                      className="text-indigo-600 hover:text-indigo-800 text-sm"
                    >
                      詳細
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-6 py-8 text-center text-sm text-gray-400">
                    該当する配信者がいません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
