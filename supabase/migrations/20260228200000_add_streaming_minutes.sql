-- daily_earnings に配信時間（分）カラムを追加
ALTER TABLE daily_earnings
  ADD COLUMN IF NOT EXISTS streaming_minutes integer NOT NULL DEFAULT 0;
