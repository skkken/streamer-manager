-- ============================================================
-- Enable Row Level Security on all tables
-- Defense-in-depth: prevent direct data access via anon key
-- Service role key (used by all API routes) bypasses RLS
-- ============================================================

-- 1. streamers
ALTER TABLE streamers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users have full access" ON streamers;
CREATE POLICY "Authenticated users have full access" ON streamers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. self_check_templates
ALTER TABLE self_check_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users have full access" ON self_check_templates;
CREATE POLICY "Authenticated users have full access" ON self_check_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. self_checks
ALTER TABLE self_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users have full access" ON self_checks;
CREATE POLICY "Authenticated users have full access" ON self_checks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. staff_notes
ALTER TABLE staff_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users have full access" ON staff_notes;
CREATE POLICY "Authenticated users have full access" ON staff_notes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. checkin_tokens
ALTER TABLE checkin_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users have full access" ON checkin_tokens;
CREATE POLICY "Authenticated users have full access" ON checkin_tokens
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. line_jobs
ALTER TABLE line_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users have full access" ON line_jobs;
CREATE POLICY "Authenticated users have full access" ON line_jobs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. daily_earnings
ALTER TABLE daily_earnings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users have full access" ON daily_earnings;
CREATE POLICY "Authenticated users have full access" ON daily_earnings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. level_thresholds_monthly
ALTER TABLE level_thresholds_monthly ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users have full access" ON level_thresholds_monthly;
CREATE POLICY "Authenticated users have full access" ON level_thresholds_monthly
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 9. streamer_monthly_stats
ALTER TABLE streamer_monthly_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users have full access" ON streamer_monthly_stats;
CREATE POLICY "Authenticated users have full access" ON streamer_monthly_stats
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 10. message_settings
ALTER TABLE message_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users have full access" ON message_settings;
CREATE POLICY "Authenticated users have full access" ON message_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 11. line_registrations
ALTER TABLE line_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users have full access" ON line_registrations;
CREATE POLICY "Authenticated users have full access" ON line_registrations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
