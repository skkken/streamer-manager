import AdminLayout from '@/components/layout/AdminLayout'
import Badge from '@/components/ui/Badge'
import Card, { CardHeader, CardBody } from '@/components/ui/Card'
import { createServerClient } from '@/lib/supabase/server'
import { getJstDateString } from '@/lib/jst'
import { LineJobStatus } from '@/lib/types'
import NotificationsClient from './NotificationsClient'

const statusVariant: Record<LineJobStatus, 'green' | 'red' | 'yellow' | 'gray' | 'blue'> = {
  sent: 'green',
  failed: 'red',
  queued: 'yellow',
  sending: 'blue',
  skipped: 'gray',
}

async function getJobs(date: string) {
  try {
    const supabase = createServerClient()
    const { data } = await supabase
      .from('line_jobs')
      .select('*, streamer:streamers(display_name)')
      .eq('date', date)
      .order('created_at', { ascending: false })
      .limit(200)
    return data ?? []
  } catch {
    return []
  }
}

export default async function NotificationsPage() {
  const today = getJstDateString()
  const jobs = await getJobs(today)

  const stats = {
    queued: jobs.filter((j) => j.status === 'queued').length,
    sending: jobs.filter((j) => j.status === 'sending').length,
    sent: jobs.filter((j) => j.status === 'sent').length,
    failed: jobs.filter((j) => j.status === 'failed').length,
    skipped: jobs.filter((j) => j.status === 'skipped').length,
  }

  return (
    <AdminLayout title="通知ジョブ状況">
      {/* サマリー */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <StatItem label="キュー" value={stats.queued} color="yellow" />
        <StatItem label="送信中" value={stats.sending} color="blue" />
        <StatItem label="送信済み" value={stats.sent} color="green" />
        <StatItem label="失敗" value={stats.failed} color="red" />
        <StatItem label="スキップ" value={stats.skipped} color="gray" />
      </div>

      {/* 手動実行ボタン（Client Component） */}
      <NotificationsClient today={today} />

      {/* ジョブ一覧 */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-800">
            ジョブ一覧 — {today}（{jobs.length} 件）
          </h2>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-gray-600">配信者</th>
                <th className="text-left px-4 py-3 text-gray-600">種別</th>
                <th className="text-left px-4 py-3 text-gray-600">状態</th>
                <th className="text-left px-4 py-3 text-gray-600">試行</th>
                <th className="text-left px-4 py-3 text-gray-600">エラー</th>
                <th className="text-left px-4 py-3 text-gray-600">更新</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                    本日のジョブはまだありません
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      {(job.streamer as { display_name?: string })?.display_name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {job.kind}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[job.status as LineJobStatus]}>
                        {job.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{job.attempts}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">
                      {job.last_error ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(job.updated_at).toLocaleTimeString('ja-JP')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminLayout>
  )
}

function StatItem({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: 'yellow' | 'blue' | 'green' | 'red' | 'gray'
}) {
  const cls = {
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    gray: 'bg-gray-50 border-gray-200 text-gray-600',
  }[color]
  return (
    <div className={`rounded-lg border px-4 py-3 ${cls}`}>
      <p className="text-xs font-medium">{label}</p>
      <p className="text-2xl font-bold mt-0.5">{value}</p>
    </div>
  )
}
