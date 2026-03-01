-- ============================================================
-- user_channel_permissions: ユーザーごとのLINEチャネル閲覧権限
-- staff ロールのユーザーに対して、閲覧可能なチャネルを制限する
-- admin ロールのユーザーはこのテーブルに関係なく全チャネルを閲覧可能
-- ============================================================

CREATE TABLE user_channel_permissions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES line_channels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel_id)
);

CREATE INDEX idx_ucp_user_id ON user_channel_permissions(user_id);
CREATE INDEX idx_ucp_channel_id ON user_channel_permissions(channel_id);

COMMENT ON TABLE user_channel_permissions IS 'ユーザーごとのLINEチャネル閲覧権限（staffのみ制限対象）';

-- RLS
ALTER TABLE user_channel_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own permissions" ON user_channel_permissions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
