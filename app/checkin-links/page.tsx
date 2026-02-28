import AdminLayout from '@/components/layout/AdminLayout'
import { createServerClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import CheckinLinksClient from './CheckinLinksClient'

async function getStreamers() {
  try {
    const supabase = createServerClient()
    const { data } = await supabase
      .from('streamers')
      .select('id, display_name, status')
      .order('display_name', { ascending: true })
    return data ?? []
  } catch {
    return []
  }
}

function getTodayJST(): string {
  return new Date().toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-')
}

export default async function CheckinLinksPage() {
  const streamers = await getStreamers()
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3001'
  const proto = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${proto}://${host}`
  const today = getTodayJST()

  return (
    <AdminLayout title="チェックインリンク一覧">
      <CheckinLinksClient streamers={streamers} baseUrl={baseUrl} today={today} />
    </AdminLayout>
  )
}
