/**
 * LINE Messaging API ユーティリティ
 * - pushMessage / replyMessage / getDisplayName
 * - チャネルトークンは引数で渡す（フォールバック: 環境変数）
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
 * @param channelAccessToken チャネル固有のトークン（省略時は env var フォールバック）
 */
export async function sendLineMessage(
  lineUserId: string,
  messages: LineMessage[],
  channelAccessToken?: string
): Promise<{ ok: boolean; error?: string }> {
  const token = channelAccessToken ?? process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) {
    return { ok: false, error: 'LINE channel access token is not available' }
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

/** LINE Reply API でメッセージを送信 */
export async function replyLineMessage(
  replyToken: string,
  text: string,
  channelAccessToken?: string
): Promise<void> {
  const token = channelAccessToken ?? process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) return
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }],
    }),
  })
}

/** LINE Profile API で display name を取得 */
export async function getLineDisplayName(
  lineUserId: string,
  channelAccessToken?: string
): Promise<string | null> {
  const token = channelAccessToken ?? process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) return null
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    return (data.displayName as string) ?? null
  } catch {
    return null
  }
}

/** 自己評価リンクのメッセージ */
export function buildCheckinMessage(name: string, url: string, dateLabel: string): LineMessage {
  return {
    type: 'text',
    text: `【${dateLabel}の自己評価】\n${name}さん、お疲れさまです。\n${dateLabel}の自己評価の入力をお願いします。\n\n${url}\n\n※URLは翌日昼まで有効です。`,
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
