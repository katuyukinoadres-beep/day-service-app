-- 管理ダッシュボード用スキーマ変更

-- profiles に super_admin フラグ追加
ALTER TABLE profiles ADD COLUMN is_super_admin boolean NOT NULL DEFAULT false;

-- facilities に管理用カラム追加
ALTER TABLE facilities
  ADD COLUMN is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN plan text DEFAULT 'free',
  ADD COLUMN notes text DEFAULT NULL;

-- ============================================================
-- super_admin 用 RLS ポリシー
-- super_admin は全施設のデータを閲覧・更新可能
-- ============================================================

-- facilities: super_admin は全施設を閲覧・更新・作成可能
CREATE POLICY "super_admin_select_all_facilities" ON facilities
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
  ));

CREATE POLICY "super_admin_update_all_facilities" ON facilities
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
  ));

CREATE POLICY "super_admin_insert_facilities" ON facilities
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
  ));

-- profiles: super_admin は全プロフィールを閲覧・更新可能
CREATE POLICY "super_admin_select_all_profiles" ON profiles
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true
  ));

CREATE POLICY "super_admin_update_all_profiles" ON profiles
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true
  ));

-- children: super_admin は全児童を閲覧可能
CREATE POLICY "super_admin_select_all_children" ON children
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
  ));

-- daily_records: super_admin は全記録を閲覧可能
CREATE POLICY "super_admin_select_all_daily_records" ON daily_records
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
  ));

-- attendances: super_admin は全出席データを閲覧可能
CREATE POLICY "super_admin_select_all_attendances" ON attendances
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
  ));

-- phrase_bank: super_admin は全フレーズを閲覧可能
CREATE POLICY "super_admin_select_all_phrase_bank" ON phrase_bank
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
  ));

-- ============================================================
-- ダッシュボード統計用関数
-- ============================================================
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'total_facilities', (SELECT count(*) FROM facilities WHERE is_active = true),
    'total_users', (SELECT count(*) FROM profiles),
    'total_children', (SELECT count(*) FROM children WHERE is_active = true),
    'total_records', (SELECT count(*) FROM daily_records),
    'records_today', (SELECT count(*) FROM daily_records WHERE date = current_date),
    'facilities_with_activity_today', (
      SELECT count(DISTINCT facility_id)
      FROM daily_records
      WHERE date = current_date
    )
  );
$$;
