/**
 * JST基準の日付ユーティリティ（営業日方式）
 * サーバーTZに依存しないよう、常にUTC+9で計算する
 *
 * 営業日境界: JST 05:00
 * - JST 00:00〜04:59 → 前日扱い（深夜配信者の実態に合わせる）
 * - JST 05:00〜23:59 → 当日扱い
 */

/** 営業日境界オフセット（時間） */
const BUSINESS_DAY_OFFSET_HOURS = 5

export function getJstNow(): Date {
  const now = new Date()
  // UTCミリ秒 + 9時間
  return new Date(now.getTime() + 9 * 60 * 60 * 1000)
}

/** YYYY-MM-DD (JST営業日: 05:00区切り) */
export function getJstDateString(date?: Date): string {
  const d = date ?? getJstNow()
  // 営業日境界: 5時間戻してから日付を取る → 0:00〜4:59は前日扱い
  const shifted = new Date(d.getTime() - BUSINESS_DAY_OFFSET_HOURS * 60 * 60 * 1000)
  const y = shifted.getUTCFullYear()
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const day = String(shifted.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 営業日の終了時刻 = 翌暦日 JST 04:59:59（= UTC 19:59:59 同日） */
export function getJstEndOfDay(dateStr?: string): Date {
  const str = dateStr ?? getJstDateString()
  // 営業日 dateStr の終わり = 翌暦日 04:59:59 JST = dateStr当日 19:59:59 UTC
  return new Date(`${str}T19:59:59Z`)
}
