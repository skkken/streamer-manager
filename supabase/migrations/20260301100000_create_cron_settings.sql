-- ============================================================
-- Cron ジョブ管理設定
-- ============================================================

CREATE TABLE IF NOT EXISTS cron_settings (
  job_key         text PRIMARY KEY,
  description     text NOT NULL DEFAULT '',
  schedule        text NOT NULL DEFAULT '',
  enabled         boolean NOT NULL DEFAULT true,
  last_run_at     timestamptz,
  last_result     jsonb,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE cron_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users have full access" ON cron_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- updated_at 自動更新
CREATE TRIGGER trg_cron_settings_updated_at
  BEFORE UPDATE ON cron_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 初期データ
INSERT INTO cron_settings (job_key, description, schedule, enabled)
VALUES
  ('schedule-daily-checkin', '毎日のチェックイントークン発行・LINE通知キュー登録', '5 20 * * * (05:05 JST)', true),
  ('worker-send-line', 'LINEメッセージキュー処理（最大50件/回）', '*/1 * * * * (毎分)', true)
ON CONFLICT (job_key) DO NOTHING;
