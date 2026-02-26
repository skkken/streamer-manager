/**
 * JST基準の日付ユーティリティ
 * サーバーTZに依存しないよう、常にUTC+9で計算する
 */

export function getJstNow(): Date {
  const now = new Date()
  // UTCミリ秒 + 9時間
  return new Date(now.getTime() + 9 * 60 * 60 * 1000)
}

/** YYYY-MM-DD (JST) */
export function getJstDateString(date?: Date): string {
  const d = date ?? getJstNow()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** JST 当日の 23:59:59 UTC を返す */
export function getJstEndOfDay(dateStr?: string): Date {
  const str = dateStr ?? getJstDateString()
  // JST 23:59:59 = UTC 14:59:59 (same calendar day)
  return new Date(`${str}T14:59:59Z`)
}
