import AdminLayout from '@/components/layout/AdminLayout'
import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import StreamerDetailClient from './StreamerDetailClient'

async function getData(id: string) {
  try {
    const supabase = createServerClient()
    const [streamerRes, checksRes, notesRes] = await Promise.all([
      supabase.from('streamers').select('*').eq('id', id).single(),
      supabase
        .from('self_checks')
        .select('*')
        .eq('streamer_id', id)
        .order('date', { ascending: false })
        .limit(30),
      supabase
        .from('staff_notes')
        .select('*')
        .eq('streamer_id', id)
        .order('created_at', { ascending: false }),
    ])
    return {
      streamer: streamerRes.data,
      checks: checksRes.data ?? [],
      notes: notesRes.data ?? [],
    }
  } catch {
    return { streamer: null, checks: [], notes: [] }
  }
}

export default async function StreamerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { streamer, checks, notes } = await getData(id)

  if (!streamer) {
    notFound()
  }

  return (
    <AdminLayout title="配信者詳細">
      <StreamerDetailClient streamer={streamer} checks={checks} notes={notes} />
    </AdminLayout>
  )
}
