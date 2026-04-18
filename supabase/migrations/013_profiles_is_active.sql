-- Phase B8a: スタッフ退職時の即時アカウント遮断
-- BYOD前提のため、退職時に管理者が `is_active = false` にすると即座にRLSで施設データから締め出す

-- ============================================================
-- profiles に is_active カラム追加
-- ============================================================
alter table profiles
  add column if not exists is_active boolean not null default true;

comment on column profiles.is_active is '有効フラグ。false にすると RLS 下で所属施設データから締め出される（退職処理用）';

-- ============================================================
-- RLS ポリシー更新: is_active = false のユーザーは所属施設データから締め出す
-- 既存ポリシーを drop → create で再定義
-- profiles 自体は自分のレコードを見られるようにしておく（UX / 退職通知判定のため）
-- ============================================================

-- children
drop policy if exists "children_select" on children;
create policy "children_select" on children for select using (
  facility_id = (select facility_id from profiles where id = auth.uid() and is_active = true)
);
drop policy if exists "children_insert" on children;
create policy "children_insert" on children for insert with check (
  facility_id = (select facility_id from profiles where id = auth.uid() and is_active = true)
);
drop policy if exists "children_update" on children;
create policy "children_update" on children for update using (
  facility_id = (select facility_id from profiles where id = auth.uid() and is_active = true)
);
drop policy if exists "children_delete" on children;
create policy "children_delete" on children for delete using (
  facility_id = (select facility_id from profiles where id = auth.uid() and is_active = true)
);

-- facilities
drop policy if exists "facilities_select" on facilities;
create policy "facilities_select" on facilities for select using (
  id = (select facility_id from profiles where id = auth.uid() and is_active = true)
);

-- attendances
drop policy if exists "attendances_select" on attendances;
create policy "attendances_select" on attendances for select using (
  facility_id = (select facility_id from profiles where id = auth.uid() and is_active = true)
);
drop policy if exists "attendances_insert" on attendances;
create policy "attendances_insert" on attendances for insert with check (
  facility_id = (select facility_id from profiles where id = auth.uid() and is_active = true)
);
drop policy if exists "attendances_update" on attendances;
create policy "attendances_update" on attendances for update using (
  facility_id = (select facility_id from profiles where id = auth.uid() and is_active = true)
);

-- phrase_bank
drop policy if exists "phrase_bank_select" on phrase_bank;
create policy "phrase_bank_select" on phrase_bank for select using (
  is_default = true
  or facility_id = (select facility_id from profiles where id = auth.uid() and is_active = true)
);
drop policy if exists "phrase_bank_insert" on phrase_bank;
create policy "phrase_bank_insert" on phrase_bank for insert with check (
  facility_id = (select facility_id from profiles where id = auth.uid() and is_active = true)
);
drop policy if exists "phrase_bank_update" on phrase_bank;
create policy "phrase_bank_update" on phrase_bank for update using (
  facility_id = (select facility_id from profiles where id = auth.uid() and is_active = true)
);

-- daily_records
drop policy if exists "daily_records_select" on daily_records;
create policy "daily_records_select" on daily_records for select using (
  facility_id = (select facility_id from profiles where id = auth.uid() and is_active = true)
);
drop policy if exists "daily_records_insert" on daily_records;
create policy "daily_records_insert" on daily_records for insert with check (
  facility_id = (select facility_id from profiles where id = auth.uid() and is_active = true)
);
drop policy if exists "daily_records_update" on daily_records;
create policy "daily_records_update" on daily_records for update using (
  facility_id = (select facility_id from profiles where id = auth.uid() and is_active = true)
);
drop policy if exists "daily_records_delete" on daily_records;
create policy "daily_records_delete" on daily_records for delete using (
  facility_id = (select facility_id from profiles where id = auth.uid() and is_active = true)
);

-- activity_items
drop policy if exists "activity_items_select" on activity_items;
create policy "activity_items_select" on activity_items for select using (
  facility_id = (select facility_id from profiles where id = auth.uid() and is_active = true)
);
drop policy if exists "activity_items_insert" on activity_items;
create policy "activity_items_insert" on activity_items for insert with check (
  facility_id = (select facility_id from profiles where id = auth.uid() and is_active = true)
  and (select role from profiles where id = auth.uid() and is_active = true) = 'admin'
);
drop policy if exists "activity_items_update" on activity_items;
create policy "activity_items_update" on activity_items for update using (
  facility_id = (select facility_id from profiles where id = auth.uid() and is_active = true)
  and (select role from profiles where id = auth.uid() and is_active = true) = 'admin'
);

-- daily_record_activities
drop policy if exists "dra_select" on daily_record_activities;
create policy "dra_select" on daily_record_activities for select using (
  daily_record_id in (
    select id from daily_records
    where facility_id = (select facility_id from profiles where id = auth.uid() and is_active = true)
  )
);
drop policy if exists "dra_insert" on daily_record_activities;
create policy "dra_insert" on daily_record_activities for insert with check (
  daily_record_id in (
    select id from daily_records
    where facility_id = (select facility_id from profiles where id = auth.uid() and is_active = true)
  )
);
drop policy if exists "dra_update" on daily_record_activities;
create policy "dra_update" on daily_record_activities for update using (
  daily_record_id in (
    select id from daily_records
    where facility_id = (select facility_id from profiles where id = auth.uid() and is_active = true)
  )
);
drop policy if exists "dra_delete" on daily_record_activities;
create policy "dra_delete" on daily_record_activities for delete using (
  daily_record_id in (
    select id from daily_records
    where facility_id = (select facility_id from profiles where id = auth.uid() and is_active = true)
  )
);

-- quick_templates: user_id = auth.uid() で自分のテンプレ管理。is_active=false にした退職者は
-- 自分のテンプレへのアクセスも遮断する（ただし profiles.is_active と quick_templates.is_active は
-- 別物。前者はユーザー退職、後者はテンプレ廃止）
drop policy if exists "quick_templates_select" on quick_templates;
create policy "quick_templates_select" on quick_templates for select using (
  user_id = auth.uid()
  and exists (select 1 from profiles where id = auth.uid() and is_active = true)
);
drop policy if exists "quick_templates_insert" on quick_templates;
create policy "quick_templates_insert" on quick_templates for insert with check (
  user_id = auth.uid()
  and exists (select 1 from profiles where id = auth.uid() and is_active = true)
);
drop policy if exists "quick_templates_update" on quick_templates;
create policy "quick_templates_update" on quick_templates for update using (
  user_id = auth.uid()
  and exists (select 1 from profiles where id = auth.uid() and is_active = true)
);
drop policy if exists "quick_templates_delete" on quick_templates;
create policy "quick_templates_delete" on quick_templates for delete using (
  user_id = auth.uid()
  and exists (select 1 from profiles where id = auth.uid() and is_active = true)
);

-- NOTE: profiles 自体の RLS は意図的に更新しない。
-- 退職者が自分の profile を閲覧できないと、アプリは「ログインはできるが何も見えない」
-- 状態になる。middleware 側で profiles.is_active を確認し「アカウントが無効化されました」
-- メッセージを出して sign out するフローは今後追加予定。
