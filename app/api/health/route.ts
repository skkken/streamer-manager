import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = {}

  const supabase = createServerClient()

  // Supabase 接続チェック
  try {
    const { error } = await supabase.from('streamers').select('id').limit(1)
    checks.database = error ? 'error' : 'ok'
  } catch {
    checks.database = 'error'
  }

  // 必須環境変数チェック（LINE 認証情報は DB 管理に移行済み）
  const requiredEnvs = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]
  checks.env = requiredEnvs.every((key) => process.env[key]) ? 'ok' : 'error'

  // LINE チャネルが DB に登録されているかチェック
  try {
    const { data: channels } = await supabase
      .from('line_channels')
      .select('id')
      .eq('is_active', true)
      .limit(1)
    checks.line_channels = channels?.length ? 'ok' : 'error'
  } catch {
    checks.line_channels = 'error'
  }

  const healthy = Object.values(checks).every((v) => v === 'ok')

  return NextResponse.json(
    { status: healthy ? 'healthy' : 'degraded', checks },
    { status: healthy ? 200 : 503 }
  )
}
