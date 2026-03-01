import { timingSafeEqual } from 'crypto'

/**
 * Cron Secret をタイミング攻撃に耐性のある方法で検証する
 */
export function verifyCronSecret(authHeader: string | null): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false

  const bearer = 'Bearer '
  if (!authHeader?.startsWith(bearer)) return false
  const provided = authHeader.slice(bearer.length)

  const a = Buffer.from(provided)
  const b = Buffer.from(cronSecret)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
