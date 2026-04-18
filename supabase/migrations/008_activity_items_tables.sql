-- Phase 1.1 spec-reset: activity items master + daily_record_activities linking
-- 施設ごとにカスタマイズ可能な活動項目マスタと日次記録との連結テーブルを新設
-- 既存の daily_records.activities text[] カラムは後方互換のため残置、
-- 新規記録は daily_record_activities を使用

-- ============================================================
-- 活動項目マスタ（施設カスタマイズ可能）
-- ============================================================
create table activity_items (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id),
  name text not null,
  sort_order int not null default 0,
  has_detail_field boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (facility_id, name)
);

create index idx_activity_items_facility_active
  on activity_items (facility_id, is_active, sort_order);

-- updated_at 自動更新トリガー
create or replace function update_activity_items_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger activity_items_updated_at
  before update on activity_items
  for each row
  execute function update_activity_items_updated_at();

-- ============================================================
-- 日次記録×活動項目 連結テーブル
-- ============================================================
create table daily_record_activities (
  id uuid primary key default uuid_generate_v4(),
  daily_record_id uuid not null references daily_records(id) on delete cascade,
  activity_item_id uuid not null references activity_items(id),
  detail text,
  created_at timestamptz not null default now(),
  unique (daily_record_id, activity_item_id)
);

create index idx_dra_daily_record_id on daily_record_activities (daily_record_id);
create index idx_dra_activity_item_id on daily_record_activities (activity_item_id);

-- ============================================================
-- RLS 有効化
-- ============================================================
alter table activity_items enable row level security;
alter table daily_record_activities enable row level security;

-- ============================================================
-- RLS ポリシー: activity_items
-- ============================================================

-- 自施設の活動項目を読める
create policy "activity_items_select" on activity_items
  for select using (
    facility_id = (select facility_id from profiles where id = auth.uid())
  );

-- 自施設の admin のみ追加可能
create policy "activity_items_insert" on activity_items
  for insert with check (
    facility_id = (select facility_id from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) = 'admin'
  );

-- 自施設の admin のみ更新可能
create policy "activity_items_update" on activity_items
  for update using (
    facility_id = (select facility_id from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) = 'admin'
  );

-- 物理削除は不可（is_active = false による論理削除のみ）
-- → delete policy は作成しない

-- ============================================================
-- RLS ポリシー: daily_record_activities
-- ============================================================

-- 自施設の記録に紐づくもののみ
create policy "dra_select" on daily_record_activities
  for select using (
    daily_record_id in (
      select id from daily_records
      where facility_id = (select facility_id from profiles where id = auth.uid())
    )
  );

create policy "dra_insert" on daily_record_activities
  for insert with check (
    daily_record_id in (
      select id from daily_records
      where facility_id = (select facility_id from profiles where id = auth.uid())
    )
  );

create policy "dra_update" on daily_record_activities
  for update using (
    daily_record_id in (
      select id from daily_records
      where facility_id = (select facility_id from profiles where id = auth.uid())
    )
  );

create policy "dra_delete" on daily_record_activities
  for delete using (
    daily_record_id in (
      select id from daily_records
      where facility_id = (select facility_id from profiles where id = auth.uid())
    )
  );
