-- ============================================================
-- LINE マルチチャネル対応
-- 事務所ごとに1つの LINE チャネルを DB で管理する
-- ============================================================

-- 1. line_channels テーブル
CREATE TABLE IF NOT EXISTS line_channels (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  channel_id            text NOT NULL UNIQUE,
  channel_secret        text NOT NULL,
  channel_access_token  text NOT NULL,
  webhook_path          text NOT NULL UNIQUE,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE line_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users have full access" ON line_channels
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- updated_at 自動更新
CREATE TRIGGER trg_line_channels_updated_at
  BEFORE UPDATE ON line_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- webhook_path にデフォルトで id を使うためのトリガー
CREATE OR REPLACE FUNCTION set_line_channel_webhook_path()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.webhook_path IS NULL OR NEW.webhook_path = '' THEN
    NEW.webhook_path := NEW.id::text;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_webhook_path
  BEFORE INSERT ON line_channels
  FOR EACH ROW EXECUTE FUNCTION set_line_channel_webhook_path();

-- 2. streamers に line_channel_id FK 追加
ALTER TABLE streamers
  ADD COLUMN IF NOT EXISTS line_channel_id uuid REFERENCES line_channels(id);

CREATE INDEX IF NOT EXISTS idx_streamers_line_channel_id
  ON streamers(line_channel_id);

-- 3. line_jobs に line_channel_id FK 追加
ALTER TABLE line_jobs
  ADD COLUMN IF NOT EXISTS line_channel_id uuid REFERENCES line_channels(id);

CREATE INDEX IF NOT EXISTS idx_line_jobs_line_channel_id
  ON line_jobs(line_channel_id);

-- 4. line_registrations に line_channel_id FK 追加
ALTER TABLE line_registrations
  ADD COLUMN IF NOT EXISTS line_channel_id uuid REFERENCES line_channels(id);
