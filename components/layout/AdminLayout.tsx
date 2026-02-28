import { createServerClient } from '@/lib/supabase/server'
import Sidebar from './Sidebar'

async function getPendingRegistrationCount(): Promise<number> {
  try {
    const supabase = createServerClient()
    const { count } = await supabase
      .from('line_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
    return count ?? 0
  } catch {
    return 0
  }
}

export default async function AdminLayout({
  children,
  title,
}: {
  children: React.ReactNode
  title?: string
}) {
  const pendingCount = await getPendingRegistrationCount()

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar pendingCount={pendingCount} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {title && (
            <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>
          )}
          {children}
        </div>
      </main>
    </div>
  )
}
