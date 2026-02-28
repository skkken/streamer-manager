import { createServerClient } from '@/lib/supabase/server'

/**
 * API ルートでのエラーを Supabase error_logs テーブルに記録する
 * Sentry の captureApiError と同じインターフェースを維持
 */
export function captureApiError(
  error: unknown,
  route: string,
  method: string,
  extra?: Record<string, unknown>
) {
  const err = error instanceof Error ? error : new Error(String(error))

  // 非同期で保存（レスポンスをブロックしない）
  const supabase = createServerClient()
  supabase
    .from('error_logs')
    .insert({
      route,
      method,
      message: err.message,
      stack: err.stack ?? null,
      extra: extra ?? null,
    })
    .then(({ error: insertErr }) => {
      if (insertErr) {
        // DB 保存に失敗した場合のみ console.error にフォールバック
        console.error('[error-logger] Failed to save error log:', insertErr.message)
      }
    })
}
