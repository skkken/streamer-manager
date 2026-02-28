/**
 * LINE Messaging API ユーティリティ
 * - pushMessage: 1対1メッセージ送信
 */
import type { AiType } from './types'
import type { MessageSettings } from './messages'
import { DEFAULT_MESSAGES } from './messages'

const LINE_API_URL = 'https://api.line.me/v2/bot/message/push'

export interface LineMessage {
  type: 'text'
  text: string
}

/**
 * LINE pushMessage
 * @returns { ok: boolean; error?: string }
 */
export async function sendLineMessage(
  lineUserId: string,
  messages: LineMessage[]
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) {
    return { ok: false, error: 'LINE_CHANNEL_ACCESS_TOKEN is not set' }
  }

  try {
    const res = await fetch(LINE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to: lineUserId, messages }),
    })

    if (!res.ok) {
      const text = await res.text()
      return { ok: false, error: `LINE API ${res.status}: ${text}` }
    }
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'unknown error',
    }
  }
}

/** 自己評価リンクのメッセージ */
export function buildCheckinMessage(name: string, url: string): LineMessage {
  return {
    type: 'text',
    text: `【本日の自己評価】\n${name}さん、お疲れさまです。\n本日の自己評価の入力をお願いします。\n\n${url}\n\n※URLは本日中のみ有効です。`,
  }
}

/** お礼メッセージ（5種AIタイプ対応）
 * VERY_GOOD → good、BAD/VERY_BAD → support にマッピング
 * @param messages DBから取得したメッセージ設定（省略時はデフォルト値を使用）
 */
export function buildThanksMessage(
  aiType: AiType,
  messages?: MessageSettings
): LineMessage {
  const msg = messages ?? DEFAULT_MESSAGES
  const lineKey =
    aiType === 'VERY_GOOD' || aiType === 'GOOD'
      ? 'good'
      : aiType === 'NORMAL'
      ? 'normal'
      : 'support' // BAD, VERY_BAD
  const text =
    msg[`line_thanks_${lineKey}`] ??
    DEFAULT_MESSAGES[`line_thanks_${lineKey}`]
  return { type: 'text', text }
}
