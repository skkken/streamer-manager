import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = {}

  // Supabase 接続チェック
  try {
    const supabase = createServerClient()
    const { error } = await supabase.from('streamers').select('id').limit(1)
    checks.database = error ? 'error' : 'ok'
  } catch {
    checks.database = 'error'
  }

  // 必須環境変数チェック
  const requiredEnvs = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'LINE_CHANNEL_ACCESS_TOKEN',
    'LINE_CHANNEL_SECRET',
  ]
  checks.env = requiredEnvs.every((key) => process.env[key]) ? 'ok' : 'error'

  const healthy = Object.values(checks).every((v) => v === 'ok')

  return NextResponse.json(
    { status: healthy ? 'healthy' : 'degraded', checks },
    { status: healthy ? 200 : 503 }
  )
}
