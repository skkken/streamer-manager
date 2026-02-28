-- ============================================================
-- error_logs: API エラーログを Supabase に保存
-- ============================================================

CREATE TABLE error_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  route       text NOT NULL,
  method      text NOT NULL,
  message     text,
  stack       text,
  extra       jsonb,
  resolved    boolean NOT NULL DEFAULT false
);

-- 最新のエラーを高速取得
CREATE INDEX idx_error_logs_created_at ON error_logs (created_at DESC);

-- RLS: service_role のみ書き込み、authenticated で閲覧
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read error logs" ON error_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can insert error logs" ON error_logs
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can update error logs" ON error_logs
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);
