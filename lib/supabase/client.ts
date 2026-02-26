import { createClient } from '@supabase/supabase-js'

// クライアントサイド用（Anon Key を使用）
let _client: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase env vars are not set (client)')
  }

  _client = createClient(url, key)
  return _client
}
