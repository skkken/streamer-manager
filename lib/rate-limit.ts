/**
 * インメモリ スライディングウィンドウ レート制限
 *
 * IP + パスをキーとして、ウィンドウ内のリクエスト数を追跡する。
 * Vercel サーバーレス環境ではインスタンスごとにリセットされるが、
 * 基本的なブルートフォース・DoS保護として十分に機能する。
 */

const requests = new Map<string, number[]>()

const CLEANUP_THRESHOLD = 5000

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number; reset: number } {
  const now = Date.now()
  const windowStart = now - windowMs

  const timestamps = (requests.get(key) || []).filter((t) => t > windowStart)

  if (timestamps.length >= limit) {
    requests.set(key, timestamps)
    return {
      success: false,
      remaining: 0,
      reset: Math.ceil((timestamps[0] + windowMs - now) / 1000),
    }
  }

  timestamps.push(now)
  requests.set(key, timestamps)

  // Map が大きくなりすぎたら古いエントリを削除
  if (requests.size > CLEANUP_THRESHOLD) {
    for (const [k, v] of requests) {
      const filtered = v.filter((t) => t > windowStart)
      if (filtered.length === 0) {
        requests.delete(k)
      } else {
        requests.set(k, filtered)
      }
    }
  }

  return {
    success: true,
    remaining: limit - timestamps.length,
    reset: Math.ceil(windowMs / 1000),
  }
}
