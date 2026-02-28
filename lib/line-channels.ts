import { createServerClient } from './supabase/server'
import type { LineChannel } from './types'

/** ID でアクティブなチャネルを取得 */
export async function getLineChannel(channelId: string): Promise<LineChannel | null> {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('line_channels')
    .select('*')
    .eq('id', channelId)
    .eq('is_active', true)
    .single()
  return (data as LineChannel | null) ?? null
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
  return (data as LineChannel | null) ?? null
}

/** 全アクティブチャネル一覧 */
export async function getAllActiveLineChannels(): Promise<LineChannel[]> {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('line_channels')
    .select('*')
    .eq('is_active', true)
    .order('name')
  return (data as LineChannel[] | null) ?? []
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
