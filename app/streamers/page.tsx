import AdminLayout from '@/components/layout/AdminLayout'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import NotifyToggle from '@/components/ui/NotifyToggle'
import { createServerClient } from '@/lib/supabase/server'
import { Streamer, StreamerStatus } from '@/lib/types'

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

async function getStreamers(): Promise<Streamer[]> {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('streamers')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  } catch {
    return []
  }
}

export default async function StreamersPage() {
  const streamers = await getStreamers()

  return (
    <AdminLayout title="配信者一覧">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{streamers.length} 件</p>
        <Link href="/streamers/new">
          <Button size="sm">+ 新規作成</Button>
        </Link>
      </div>

      {streamers.length === 0 ? (
        <Card>
          <div className="px-6 py-12 text-center">
            <p className="text-gray-400 text-sm">まだ配信者が登録されていません</p>
            <Link href="/streamers/new">
              <Button size="sm" className="mt-4">+ 最初の配信者を追加</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-3 text-gray-600 font-medium">名前</th>
                  <th className="text-left px-6 py-3 text-gray-600 font-medium">ステータス</th>
                  <th className="text-left px-6 py-3 text-gray-600 font-medium">通知</th>
                  <th className="text-left px-6 py-3 text-gray-600 font-medium">登録日</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {streamers.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{s.display_name}</td>
                    <td className="px-6 py-3">
                      <Badge variant={statusVariant[s.status]}>{statusLabel[s.status]}</Badge>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <NotifyToggle streamerId={s.id} enabled={s.notify_enabled} />
                        <span className="text-xs text-gray-500">
                          {s.notify_enabled ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(s.created_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/streamers/${s.id}`}
                        className="text-indigo-600 hover:text-indigo-800 text-sm"
                      >
                        詳細
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AdminLayout>
  )
}
