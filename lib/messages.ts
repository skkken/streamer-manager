import { createServerClient } from './supabase/server'

export type MessageSettings = Record<string, string>

/** ハードコードされたデフォルト値（DB未設定時のフォールバック） */
export const DEFAULT_MESSAGES: MessageSettings = {
  line_thanks_good:
    '【自己評価ありがとうございます】\n入力を確認しました。\n今日も良い積み上げです。お疲れさまでした。\n※返信は不要です。',
  line_thanks_normal:
    '【自己評価ありがとうございます】\n入力を確認しました。\n無理のないペースで続けていきましょう。\n※返信は不要です。',
  line_thanks_support:
    '【自己評価ありがとうございます】\n入力を確認しました。\n大変な日もあります。必要なら相談してください。\n※返信は不要です。',

  done_comment_very_good: '素晴らしいパフォーマンスです！今日はすべての項目で好成績でした。',
  done_comment_good: '良い流れで積み上がっています。今日も基本動作が安定しています。',
  done_comment_normal: '入力ありがとうございます。できている点と、改善できる点が見えています。',
  done_comment_bad: '少し難しい日だったようです。無理せず一つずつ改善していきましょう。',
  done_comment_very_bad: '大変な日もあります。まずは休息と負荷調整を優先してください。',

  done_action_very_good_pre: "次回も『配信前の準備（告知・テーマ決め）』をこのまま継続しましょう。この調子です！",
  done_action_very_good_live: "次回も『配信中の反応（コメント対応）』をこのまま継続しましょう。この調子です！",
  done_action_very_good_post: "次回も『配信後の振り返り』をこのまま継続しましょう。この調子です！",

  done_action_good_pre: '次回は「配信前の準備（告知・テーマ決め）」をこのまま継続しましょう。',
  done_action_good_live: '次回は「配信中の反応（コメント対応）」をこのまま継続しましょう。',
  done_action_good_post: '次回は「配信後の振り返り」をこのまま継続しましょう。',

  done_action_normal_pre: '次回は「配信前の準備（告知・テーマ決め）」を1つだけ確実にやってみてください。',
  done_action_normal_live: '次回は「配信中の反応（コメント対応）」を1つだけ意識してみてください。',
  done_action_normal_post: '次回は「配信後の振り返り」を短くてもいいので1回やってみてください。',

  done_action_bad_pre: '次回は「配信前の準備」を1点だけに絞って取り組んでみてください。',
  done_action_bad_live: '次回は「配信中の反応」を1点だけに絞って意識してみてください。',
  done_action_bad_post: '次回は「配信後の振り返り」をひと言だけでも残してみてください。',

  done_action_very_bad_pre: '明日は「配信前の準備」を「できる範囲で1つだけ」やれたら十分です。',
  done_action_very_bad_live: '明日は「配信中の反応」を「できる範囲で1つだけ」意識できたら十分です。',
  done_action_very_bad_post: '明日は「配信後の振り返り」を「ひと言だけ」でも残せたら十分です。',

  done_negative_supplement: '必要であれば、スタッフに相談して大丈夫です。',
  done_footer: 'お疲れさまでした。このページは閉じて大丈夫です。',

  line_reg_welcome:
    '登録を開始します。\nあなたの名前（本名またはニックネーム）を入力してください。',
  line_reg_ask_tiktok:
    'ありがとうございます！\n次に、TikTok IDを入力してください。\n（例: @your_tiktok_id）',
  line_reg_ask_office:
    'ありがとうございます！\n最後に、所属事務所名を入力してください。\n（事務所に所属していない場合は「なし」と入力してください）',
  line_reg_done:
    '登録情報を受け付けました！\nスタッフが確認後、ご連絡いたします。しばらくお待ちください。',

  line_stream_end_keyword: '配信終了',
  line_stream_end_reply:
    '配信お疲れさまでした！\n以下のリンクから本日の自己評価を入力してください。\n\n{url}\n\n※URLは本日中のみ有効です。',
  line_checkin_reminder:
    '【リマインド】\n{name}さん、本日の自己評価がまだ入力されていません。\n以下のリンクから入力をお願いします。\n\n{url}\n\n※URLは本日中のみ有効です。',
}

/** DBから設定を取得。失敗時はデフォルト値にフォールバック */
export async function getMessageSettings(): Promise<MessageSettings> {
  try {
    const supabase = createServerClient()
    const { data } = await supabase.from('message_settings').select('key, value')
    const result = { ...DEFAULT_MESSAGES }
    for (const row of data ?? []) {
      result[row.key] = row.value
    }
    return result
  } catch {
    return { ...DEFAULT_MESSAGES }
  }
}
