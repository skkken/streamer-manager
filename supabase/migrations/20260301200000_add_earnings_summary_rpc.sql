-- 配信者一覧ページ用: ダイヤ・配信時間の集計をDB側で実行（全行転送を回避）
CREATE OR REPLACE FUNCTION get_earnings_summary(month_start text)
RETURNS TABLE(
  streamer_id uuid,
  total_diamonds bigint,
  month_diamonds bigint,
  total_streaming_minutes bigint,
  month_streaming_minutes bigint
) AS $$
  SELECT
    de.streamer_id,
    COALESCE(SUM(de.diamonds), 0)::bigint AS total_diamonds,
    COALESCE(SUM(CASE WHEN de.date >= month_start::date THEN de.diamonds ELSE 0 END), 0)::bigint AS month_diamonds,
    COALESCE(SUM(de.streaming_minutes), 0)::bigint AS total_streaming_minutes,
    COALESCE(SUM(CASE WHEN de.date >= month_start::date THEN de.streaming_minutes ELSE 0 END), 0)::bigint AS month_streaming_minutes
  FROM daily_earnings de
  GROUP BY de.streamer_id;
$$ LANGUAGE sql STABLE;
