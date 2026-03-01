-- ============================================================
-- user_roles: ユーザーロール管理テーブル
-- ============================================================

CREATE TABLE user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role    TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  user_roles IS 'ユーザーごとのロール管理（admin / staff）';
COMMENT ON COLUMN user_roles.role IS 'admin: 管理者, staff: 一般スタッフ';

-- RLS を有効化
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- authenticated ユーザーは自分のロールのみ SELECT 可能
CREATE POLICY "Users can read own role" ON user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- service_role のみ INSERT / UPDATE / DELETE 可能（デフォルトで許可）
-- ※ service_role は RLS をバイパスするため、明示的なポリシーは不要

-- ============================================================
-- 初期設定:
-- 既存ユーザーを admin にするには以下を実行:
--   INSERT INTO user_roles (user_id, role)
--   VALUES ('<your-user-uuid>', 'admin');
-- ============================================================
