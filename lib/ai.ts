import { AiType, TemplateField } from './types'

/** ネガティブワードリスト */
const NEGATIVE_WORDS = ['辞め', '無理', '辛い', 'しんどい', '向いてない', 'きつい']

/** テキスト中にネガワードが含まれるか */
function detectNegative(texts: string[]): boolean {
  const joined = texts.join(' ')
  return NEGATIVE_WORDS.some((word) => joined.includes(word))
}

/** prefix (pre/live/post) を key から抽出 */
function getPrefix(key: string): 'pre' | 'live' | 'post' | null {
  if (key.startsWith('pre_')) return 'pre'
  if (key.startsWith('live_')) return 'live'
  if (key.startsWith('post_')) return 'post'
  return null
}

// ============================================================
// AI判定結果
// ============================================================
export interface AiResult {
  ai_type: AiType
  ai_comment: string
  ai_next_action: string
  ai_negative_detected: boolean
  overall_score: number
}

// ============================================================
// コメント文面テンプレート
// ============================================================
const COMMENTS: Record<AiType, { comment: string; next_action: Record<'pre' | 'live' | 'post', string> }> = {
  GOOD: {
    comment: '良い流れで積み上がっています。今日も基本動作が安定しています。',
    next_action: {
      pre: "次回は『配信前の準備（告知・テーマ決め）』をこのまま継続しましょう。",
      live: "次回は『配信中の反応（コメント対応）』をこのまま継続しましょう。",
      post: "次回は『配信後の振り返り』をこのまま継続しましょう。",
    },
  },
  NORMAL: {
    comment: '入力ありがとうございます。できている点と、改善できる点が見えています。',
    next_action: {
      pre: "次回は『配信前の準備（告知・テーマ決め）』を1つだけ確実にやってみてください。",
      live: "次回は『配信中の反応（コメント対応）』を1つだけ意識してみてください。",
      post: "次回は『配信後の振り返り』を短くてもいいので1回やってみてください。",
    },
  },
  SUPPORT: {
    comment: '大変な日もあります。まずは休息と負荷調整を優先してください。',
    next_action: {
      pre: `明日は『配信前の準備』を"できる範囲で1つだけ"やれたら十分です。`,
      live: `明日は『配信中の反応』を"できる範囲で1つだけ"意識できたら十分です。`,
      post: `明日は『配信後の振り返り』を"ひと言だけ"でも残せたら十分です。`,
    },
  },
}

/**
 * ルールベースAI判定
 * @param fields テンプレートフィールド定義
 * @param answers 回答 { key: boolean | string }
 * @param memo 自由記述メモ
 */
export function generateAiResult(
  fields: TemplateField[],
  answers: Record<string, boolean | string>,
  memo: string
): AiResult {
  const booleanFields = fields.filter((f) => f.type === 'boolean')
  const totalBooleanCount = booleanFields.length

  let trueCount = 0
  const noByPrefix: Record<'pre' | 'live' | 'post', number> = { pre: 0, live: 0, post: 0 }

  for (const field of booleanFields) {
    const val = answers[field.key]
    if (val === true) {
      trueCount++
    } else {
      const prefix = getPrefix(field.key)
      if (prefix) {
        noByPrefix[prefix]++
      }
    }
  }

  const yesRate = totalBooleanCount > 0 ? trueCount / totalBooleanCount : 0
  const overall_score = Math.round(yesRate * 100)

  // ネガワード検出（text回答 + memo）
  const textValues = fields
    .filter((f) => f.type === 'text')
    .map((f) => (answers[f.key] as string) ?? '')
  const ai_negative_detected = detectNegative([...textValues, memo])

  // AI判定
  let ai_type: AiType
  if (ai_negative_detected || yesRate < 0.4) {
    ai_type = 'SUPPORT'
  } else if (yesRate >= 0.8) {
    ai_type = 'GOOD'
  } else {
    ai_type = 'NORMAL'
  }

  // 弱点カテゴリ抽出（NO数が最大のprefix）
  // tieは live > pre > post
  let weakArea: 'pre' | 'live' | 'post' = 'live'
  if (
    noByPrefix.live >= noByPrefix.pre &&
    noByPrefix.live >= noByPrefix.post
  ) {
    weakArea = 'live'
  } else if (noByPrefix.pre >= noByPrefix.post) {
    weakArea = 'pre'
  } else {
    weakArea = 'post'
  }

  const template = COMMENTS[ai_type]
  const ai_comment = template.comment
  const ai_next_action = template.next_action[weakArea]

  return { ai_type, ai_comment, ai_next_action, ai_negative_detected, overall_score }
}

/** SUPPORT時のネガ検出補足文 */
export const NEGATIVE_SUPPLEMENT =
  '必要であれば、スタッフに相談して大丈夫です。'
