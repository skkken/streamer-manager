/**
 * LINE Messaging API ユーティリティ
 * - pushMessage: 1対1メッセージ送信
 */

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

/** お礼メッセージ（3パターン） */
export function buildThanksMessage(aiType: 'GOOD' | 'NORMAL' | 'SUPPORT'): LineMessage {
  const texts = {
    GOOD: `【自己評価ありがとうございます】\n入力を確認しました。\n今日も良い積み上げです。お疲れさまでした。\n※返信は不要です。`,
    NORMAL: `【自己評価ありがとうございます】\n入力を確認しました。\n無理のないペースで続けていきましょう。\n※返信は不要です。`,
    SUPPORT: `【自己評価ありがとうございます】\n入力を確認しました。\n大変な日もあります。必要なら相談してください。\n※返信は不要です。`,
  }
  return { type: 'text', text: texts[aiType] }
}
