import { z } from 'zod'
import { NextResponse } from 'next/server'

// ============================================================
// 共通スキーマ
// ============================================================

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付は YYYY-MM-DD 形式で入力してください')
const uuidSchema = z.string().uuid()

// ============================================================
// Enum スキーマ
// ============================================================

const streamerStatusSchema = z.enum(['active', 'paused', 'graduated', 'dropped'])
const staffNoteStatusSchema = z.enum(['preparing', 'good', 'mostly_good', 'caution', 'danger'])

// ============================================================
// 配信者
// ============================================================

export const createStreamerSchema = z.object({
  display_name: z.string().min(1, '名前は必須です').max(100),
  line_user_id: z.string().min(1, 'LINE IDは必須です').max(100),
  tiktok_id: z.string().max(50).nullable().optional(),
  agency_name: z.string().max(100).nullable().optional(),
  manager_name: z.string().max(100).nullable().optional(),
  line_channel_id: z.string().uuid().nullable().optional(),
  status: streamerStatusSchema.optional(),
  notify_enabled: z.boolean().optional(),
  notes: z.string().max(5000).nullable().optional(),
})

export const updateStreamerSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  status: streamerStatusSchema.optional(),
  line_user_id: z.string().min(1).max(100).optional(),
  tiktok_id: z.string().max(50).nullable().optional(),
  agency_name: z.string().max(100).nullable().optional(),
  manager_name: z.string().max(100).nullable().optional(),
  line_channel_id: z.string().uuid().nullable().optional(),
  notify_enabled: z.boolean().optional(),
  level_override: z.number().int().min(1).max(8).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
})

// ============================================================
// スタッフノート
// ============================================================

export const createStaffNoteSchema = z.object({
  streamer_id: uuidSchema,
  date: dateSchema,
  category: z.string().max(200).optional(),
  current_state: z.string().max(5000).optional(),
  action: z.string().max(5000).optional(),
  next_action: z.string().max(5000).optional(),
  status: staffNoteStatusSchema.optional(),
})

export const updateStaffNoteSchema = z.object({
  date: dateSchema.optional(),
  category: z.string().max(200).optional(),
  current_state: z.string().max(5000).optional(),
  action: z.string().max(5000).optional(),
  next_action: z.string().max(5000).optional(),
  status: staffNoteStatusSchema.optional(),
})

// ============================================================
// セルフチェック / チェックイン
// ============================================================

export const selfCheckSubmitSchema = z.object({
  token: z.string().min(1, 'token は必須'),
  answers: z.record(z.string(), z.union([z.boolean(), z.string()])).optional().default({}),
  memo: z.string().max(5000).nullable().optional(),
  diamonds: z.number().finite().min(0, 'diamonds は 0 以上の数値が必須です').max(100_000_000),
  streaming_minutes: z.number().min(0).max(1440).optional().default(0),
})

export const checkinVerifySchema = z.object({
  token: z.string().min(1, 'token は必須'),
})

// ============================================================
// テンプレート
// ============================================================

const templateFieldSchema = z.object({
  key: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  type: z.enum(['boolean', 'text']),
  required: z.boolean().optional(),
})

export const templateSchemaSchema = z.object({
  fields: z.array(templateFieldSchema).min(1).max(50),
})

export const createTemplateSchema = z.object({
  name: z.string().min(1, 'テンプレ名は必須です').max(100),
  for_level: z.number().int().min(1).max(8).optional(),
  schema_json: z.string().min(1, 'schema_json は必須です'),
})

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  for_level: z.number().int().min(1).max(8).optional(),
  schema_json: z.string().optional(),
  is_active: z.boolean().optional(),
})

// ============================================================
// メッセージ設定
// ============================================================

export const messageSettingsSchema = z.array(
  z.object({
    key: z.string().min(1).max(100),
    value: z.string().max(5000),
  })
)

// ============================================================
// LINE
// ============================================================

// ============================================================
// LINE チャネル
// ============================================================

export const createLineChannelSchema = z.object({
  name: z.string().min(1, '事務所名は必須です').max(100),
  channel_id: z.string().min(1, 'チャネルIDは必須です').max(200),
  channel_secret: z.string().min(1, 'チャネルシークレットは必須です').max(200),
  channel_access_token: z.string().min(1, 'アクセストークンは必須です').max(500),
})

export const updateLineChannelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  channel_id: z.string().min(1).max(200).optional(),
  channel_secret: z.string().min(1).max(200).optional(),
  channel_access_token: z.string().min(1).max(500).optional(),
  is_active: z.boolean().optional(),
})

// ============================================================
// LINE リマインダー
// ============================================================

export const sendReminderSchema = z.object({
  streamer_ids: z.array(uuidSchema).min(1, '配信者が指定されていません').max(200),
  date: dateSchema.optional(),
})

export const registerLineUserSchema = z.object({
  display_name: z.string().min(1, '名前は必須です').max(100),
  tiktok_id: z.string().max(50).nullable().optional(),
  office_name: z.string().max(100).nullable().optional(),
  agency_name: z.string().max(100).nullable().optional(),
  manager_name: z.string().max(100).nullable().optional(),
  line_channel_id: z.string().uuid().nullable().optional(),
})

// ============================================================
// ヘルパー
// ============================================================

export function parseBody<T>(schema: z.ZodSchema<T>, body: unknown):
  { success: true; data: T } | { success: false; error: NextResponse } {
  const result = schema.safeParse(body)
  if (!result.success) {
    const flat = result.error.flatten()
    const firstError =
      flat.formErrors[0] ??
      Object.values(flat.fieldErrors).flat()[0] ??
      'バリデーションエラー'
    return {
      success: false,
      error: NextResponse.json(
        { error: firstError, details: flat.fieldErrors },
        { status: 400 }
      ),
    }
  }
  return { success: true, data: result.data }
}

/** req.json() を安全にパースしてバリデーションまで行う */
export async function parseRequest<T>(schema: z.ZodSchema<T>, req: Request):
  Promise<{ success: true; data: T } | { success: false; error: NextResponse }> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return {
      success: false,
      error: NextResponse.json({ error: 'リクエストボディが不正です' }, { status: 400 }),
    }
  }
  return parseBody(schema, body)
}
