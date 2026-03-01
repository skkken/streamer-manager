import { createServerClient } from './supabase/server'
import { decrypt } from './crypto'
import type { LineChannel } from './types'

/** DB から取得したチャネルの暗号化フィールドを復号する */
function decryptChannel(channel: LineChannel): LineChannel {
  try {
    return {
      ...channel,
      channel_secret: channel.channel_secret ? decrypt(channel.channel_secret) : channel.channel_secret,
      channel_access_token: channel.channel_access_token ? decrypt(channel.channel_access_token) : channel.channel_access_token,
    }
  } catch {
    // 暗号化前のデータはそのまま返す（マイグレーション期間中）
    return channel
  }
}

/** ID でアクティブなチャネルを取得 */
export async function getLineChannel(channelId: string): Promise<LineChannel | null> {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('line_channels')
    .select('*')
    .eq('id', channelId)
    .eq('is_active', true)
    .single()
  const channel = (data as LineChannel | null) ?? null
  return channel ? decryptChannel(channel) : null
}

/** webhook_path でアクティブなチャネルを取得 */
export async function getLineChannelByWebhookPath(webhookPath: string): Promise<LineChannel | null> {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('line_channels')
    .select('*')
    .eq('webhook_path', webhookPath)
    .eq('is_active', true)
    .single()
  const channel = (data as LineChannel | null) ?? null
  return channel ? decryptChannel(channel) : null
}

/** 全アクティブチャネル一覧 */
export async function getAllActiveLineChannels(): Promise<LineChannel[]> {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('line_channels')
    .select('*')
    .eq('is_active', true)
    .order('name')
  return ((data as LineChannel[] | null) ?? []).map(decryptChannel)
}

/** 配信者のチャネルを取得 */
export async function getLineChannelForStreamer(streamerId: string): Promise<LineChannel | null> {
  const supabase = createServerClient()
  const { data: streamer } = await supabase
    .from('streamers')
    .select('line_channel_id')
    .eq('id', streamerId)
    .single()
  if (!streamer?.line_channel_id) return null
  return getLineChannel(streamer.line_channel_id)
}
