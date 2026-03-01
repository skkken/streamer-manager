import { AiType, TemplateField } from './types'
import type { MessageSettings } from './messages'
import { DEFAULT_MESSAGES } from './messages'

/**
 * ネガティブワードリスト（カテゴリ別）
 * - 表記ゆれ（ひらがな・カタカナ・漢字）を網羅
 * - 各カテゴリで配信者のSOSサインを検出
 */
const NEGATIVE_WORDS: string[] = [
  // ── 退職・離脱シグナル ──
  '辞め', 'やめ', 'ヤメ',
  '引退', '退職',
  '続けられない', '続かない',
  '辞表',

  // ── 精神的苦痛・メンタル不調 ──
  '辛い', 'つらい', 'ツライ',
  'しんどい', 'シンドイ',
  'きつい', 'キツイ',
  '苦しい', 'くるしい',
  '疲れた', 'つかれた',
  '限界', 'げんかい',
  '鬱', 'うつ',
  '病む', '病んで', 'やんで',
  '泣いた', '泣きそう', '泣ける',
  '眠れない', '寝れない',
  '食べれない', '食べられない', '食欲ない',
  '体調悪い', '体調不良',
  '吐き気', '頭痛',
  'パニック',
  '不安', 'ふあん',
  '孤独', 'さみしい', '寂しい',
  '涙', 'なみだ',
  '壊れ', 'こわれ',

  // ── 希死念慮・自傷（最重要） ──
  '死にたい', '消えたい', 'きえたい',
  '生きてる意味', '生きる意味',
  'いなくなりたい',
  '自傷', 'リスカ', 'リストカット',

  // ── 自己否定・無力感 ──
  '無理', 'むり', 'ムリ',
  '向いてない', 'むいてない',
  'ダメ', 'だめ',
  'できない', '出来ない',
  '自信ない', '自信がない',
  '才能ない', '才能がない',
  '意味ない', '意味がない',
  '価値ない', '価値がない',
  '何やっても', 'なにやっても',
  'どうせ',
  '嫌になった', 'いやになった',
  '情けない', 'なさけない',
  '最悪', 'さいあく',

  // ── 配信活動への消極 ──
  '配信したくない', '配信やりたくない',
  'やりたくない', 'やる気ない', 'やる気がない', 'やる気出ない',
  'モチベ', 'もちべ',
  '燃え尽き', 'バーンアウト',
  'サボ', 'さぼ',
  '休みたい', 'やすみたい',
  'もういい', 'もういや',

  // ── 対人関係・ハラスメント ──
  'パワハラ', 'セクハラ', 'モラハラ',
  'いじめ', 'イジメ',
  '嫌がらせ', 'いやがらせ',
  'アンチ', 'あんち',
  '誹謗中傷', '中傷',
  '炎上', '荒らし', 'あらし',
  '脅迫', '脅され',
  'ストーカー',
  '怖い', 'こわい', 'コワイ',

  // ── 金銭的困窮 ──
  '借金', '生活できない', '生活苦',
  'お金ない', 'おかねない',
  '払えない',
]

/** テキスト中にネガワードが含まれるか */
export function detectNegative(texts: string[]): boolean {
  const joined = texts.join(' ')
  return NEGATIVE_WORDS.some((word) => joined.includes(word))
}

/** 単一テキストのネガワード検出（board等で使用） */
export function detectNegativeInText(text: string | null): boolean {
  if (!text) return false
  return NEGATIVE_WORDS.some((w) => text.includes(w))
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
// コメント文面テンプレート（フォールバック用）
// ============================================================
const COMMENTS: Record<AiType, { comment: string; next_action: Record<'pre' | 'live' | 'post', string> }> = {
  VERY_GOOD: {
    comment: '素晴らしいパフォーマンスです！今日はすべての項目で好成績でした。',
    next_action: {
      pre: "次回も『配信前の準備（告知・テーマ決め）』をこのまま継続しましょう。この調子です！",
      live: "次回も『配信中の反応（コメント対応）』をこのまま継続しましょう。この調子です！",
      post: "次回も『配信後の振り返り』をこのまま継続しましょう。この調子です！",
    },
  },
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
  BAD: {
    comment: '少し難しい日だったようです。無理せず一つずつ改善していきましょう。',
    next_action: {
      pre: "次回は『配信前の準備』を1点だけに絞って取り組んでみてください。",
      live: "次回は『配信中の反応』を1点だけに絞って意識してみてください。",
      post: "次回は『配信後の振り返り』をひと言だけでも残してみてください。",
    },
  },
  VERY_BAD: {
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
 * @param messages DBから取得したメッセージ設定（省略時はデフォルト値を使用）
 */
export function generateAiResult(
  fields: TemplateField[],
  answers: Record<string, boolean | string>,
  memo: string,
  messages?: MessageSettings
): AiResult {
  const msg = messages ?? DEFAULT_MESSAGES
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

  // AI判定（5段階）
  let ai_type: AiType
  if (ai_negative_detected) {
    ai_type = 'VERY_BAD'
  } else if (yesRate >= 0.9) {
    ai_type = 'VERY_GOOD'
  } else if (yesRate >= 0.7) {
    ai_type = 'GOOD'
  } else if (yesRate >= 0.5) {
    ai_type = 'NORMAL'
  } else if (yesRate >= 0.3) {
    ai_type = 'BAD'
  } else {
    ai_type = 'VERY_BAD'
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

  const ai_comment = msg[`done_comment_${ai_type.toLowerCase()}`] ?? COMMENTS[ai_type].comment
  const ai_next_action =
    msg[`done_action_${ai_type.toLowerCase()}_${weakArea}`] ??
    COMMENTS[ai_type].next_action[weakArea]

  return { ai_type, ai_comment, ai_next_action, ai_negative_detected, overall_score }
}
