import { createServerClient } from './supabase/server'

export type CronSetting = {
  job_key: string
  description: string
  schedule: string
  enabled: boolean
  last_run_at: string | null
  last_result: Record<string, unknown> | null
  updated_at: string
}

/** 全 cron 設定を取得 */
export async function getCronSettings(): Promise<CronSetting[]> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('cron_settings')
    .select('*')
    .order('job_key')
  if (error) throw error
  return (data ?? []) as CronSetting[]
}

/** 指定ジョブが有効かチェック（行なしの場合はデフォルト有効） */
export async function isCronEnabled(jobKey: string): Promise<boolean> {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('cron_settings')
    .select('enabled')
    .eq('job_key', jobKey)
    .single()
  return data?.enabled ?? true
}

/** 実行結果を記録 */
export async function updateCronResult(
  jobKey: string,
  result: Record<string, unknown>
): Promise<void> {
  const supabase = createServerClient()
  await supabase
    .from('cron_settings')
    .update({
      last_run_at: new Date().toISOString(),
      last_result: result,
    })
    .eq('job_key', jobKey)
}
