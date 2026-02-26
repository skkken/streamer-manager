// ============================================================
// Domain Types
// ============================================================

export type StreamerStatus = 'active' | 'paused' | 'graduated' | 'dropped'

export type LineJobKind = 'daily_checkin' | 'checkin_thanks'
export type LineJobStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'skipped'

export type StaffNoteStatus = 'open' | 'watching' | 'closed'

export type AiType = 'GOOD' | 'NORMAL' | 'SUPPORT'

// ============================================================
// Supabase row types
// ============================================================

export interface Streamer {
  id: string
  display_name: string
  status: StreamerStatus
  line_user_id: string
  notify_enabled: boolean
  notes: string | null
  created_at: string
}

export interface SelfCheckTemplate {
  id: string
  name: string
  version: string
  is_active: boolean
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
