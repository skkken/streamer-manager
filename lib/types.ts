// ============================================================
// Domain Types
// ============================================================

export type StreamerStatus = 'active' | 'paused' | 'graduated' | 'dropped'

export type LineJobKind = 'daily_checkin' | 'checkin_thanks'
export type LineJobStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'skipped'

export type StaffNoteStatus = 'preparing' | 'good' | 'mostly_good' | 'caution' | 'danger'

export type AiType = 'VERY_GOOD' | 'GOOD' | 'NORMAL' | 'BAD' | 'VERY_BAD'

// ============================================================
// Supabase row types
// ============================================================

export interface Streamer {
  id: string
  display_name: string
  status: StreamerStatus
  line_user_id: string
  tiktok_id: string | null
  agency_name: string | null
  manager_name: string | null
  line_channel_id: string | null
  notify_enabled: boolean
  notes: string | null
  created_at: string
  level_current: number
  level_max: number
  level_override: number | null
}

export interface SelfCheckTemplate {
  id: string
  name: string
  is_active: boolean
  for_level: number
  schema: TemplateSchema
  created_at: string
}

export interface TemplateField {
  key: string
  label: string
  type: 'boolean' | 'text'
  required?: boolean
}

export interface TemplateSchema {
  fields: TemplateField[]
}

export interface SelfCheck {
  id: string
  streamer_id: string
  date: string
  template_id: string
  answers: Record<string, boolean | string>
  memo: string | null
  overall_score: number | null
  ai_type: AiType | null
  ai_comment: string | null
  ai_next_action: string | null
  ai_negative_detected: boolean | null
  created_at: string
}

export interface StaffNote {
  id: string
  streamer_id: string
  date: string
  category: string
  current_state: string
  action: string
  next_action: string
  status: StaffNoteStatus
  created_at: string
}

export interface CheckinToken {
  id: string
  streamer_id: string
  date: string
  token_hash: string
  expires_at: string
  used_at: string | null
  created_at: string
}

export interface LineJob {
  id: string
  streamer_id: string
  date: string
  kind: LineJobKind
  status: LineJobStatus
  attempts: number
  last_error: string | null
  locked_at: string | null
  line_channel_id: string | null
  created_at: string
  updated_at: string
}

export interface LineChannel {
  id: string
  name: string
  channel_id: string
  channel_secret: string
  channel_access_token: string
  webhook_path: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DailyEarning {
  id: string
  streamer_id: string
  date: string
  diamonds: number
  created_at: string
  updated_at: string
}

export interface LevelThresholdMonthly {
  level: number
  threshold_diamonds_mtd: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StreamerMonthlyStat {
  id: string
  streamer_id: string
  month: string
  diamonds_mtd: number
  level_mtd: number
  created_at: string
  updated_at: string
}

// ============================================================
// Board / aggregation types
// ============================================================

export type BoardPriority = 'danger' | 'warning' | 'normal'

export interface BoardItem {
  streamer: Streamer
  priority: BoardPriority
  consecutiveMissing: number
  scoreDrop: boolean
  negativeDetected: boolean
  latestCheck: SelfCheck | null
}
