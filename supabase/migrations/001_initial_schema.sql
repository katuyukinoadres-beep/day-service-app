-- ぱっと記録 初期スキーマ
-- 放課後等デイサービス向け支援記録アプリ

-- UUID生成用
create extension if not exists "uuid-ossp";

-- ============================================================
-- 施設テーブル
-- ============================================================
create table facilities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- プロフィール（auth.users と1:1）
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  facility_id uuid not null references facilities(id),
  display_name text not null,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 児童マスタ
-- ============================================================
create table children (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id),
  name text not null,
  name_kana text,
  birth_date date,
  school text,
  grade text,
  icon_color text not null default '#1B6B4A',
  goals text[] not null default '{}',
  domain_tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 出席（日ごとの通所予定/実績）
-- ============================================================
create table attendances (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id),
  child_id uuid not null references children(id) on delete cascade,
  date date not null,
  is_present boolean not null default true,
  created_at timestamptz not null default now(),
  unique (child_id, date)
);

-- ============================================================
-- フレーズバンク
-- ============================================================
create table phrase_bank (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid references facilities(id),
  category text not null,
  text text not null,
  domain_tags text[] not null default '{}',
  sort_order int not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 日次記録（メインテーブル）
-- ============================================================
create table daily_records (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references facilities(id),
  child_id uuid not null references children(id) on delete cascade,
  date date not null,
  mood text check (mood in ('good', 'neutral', 'bad')),
  activities text[] not null default '{}',
  phrases text[] not null default '{}',
  memo text,
  arrival_time time,
  departure_time time,
  pickup_method text,
  recorded_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- updated_at 自動更新トリガー
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger children_updated_at
  before update on children
  for each row execute function update_updated_at();

create trigger daily_records_updated_at
  before update on daily_records
  for each row execute function update_updated_at();

-- ============================================================
-- RLS ポリシー
-- ============================================================
alter table facilities enable row level security;
alter table profiles enable row level security;
alter table children enable row level security;
alter table attendances enable row level security;
alter table phrase_bank enable row level security;
alter table daily_records enable row level security;

-- profiles: 自施設のプロフィールのみ
create policy "profiles_select" on profiles
  for select using (
    facility_id = (select facility_id from profiles where id = auth.uid())
  );

create policy "profiles_self_update" on profiles
  for update using (id = auth.uid());

-- facilities: 自施設のみ
create policy "facilities_select" on facilities
  for select using (
    id = (select facility_id from profiles where id = auth.uid())
  );

-- children: 自施設の児童のみ
create policy "children_select" on children
  for select using (
    facility_id = (select facility_id from profiles where id = auth.uid())
  );

create policy "children_insert" on children
  for insert with check (
    facility_id = (select facility_id from profiles where id = auth.uid())
  );

create policy "children_update" on children
  for update using (
    facility_id = (select facility_id from profiles where id = auth.uid())
  );

create policy "children_delete" on children
  for delete using (
    facility_id = (select facility_id from profiles where id = auth.uid())
  );

-- attendances: 自施設のみ
create policy "attendances_select" on attendances
  for select using (
    facility_id = (select facility_id from profiles where id = auth.uid())
  );

create policy "attendances_insert" on attendances
  for insert with check (
    facility_id = (select facility_id from profiles where id = auth.uid())
  );

create policy "attendances_update" on attendances
  for update using (
    facility_id = (select facility_id from profiles where id = auth.uid())
  );

-- phrase_bank: デフォルトフレーズ＋自施設フレーズ
create policy "phrase_bank_select" on phrase_bank
  for select using (
    is_default = true
    or facility_id = (select facility_id from profiles where id = auth.uid())
  );

create policy "phrase_bank_insert" on phrase_bank
  for insert with check (
    facility_id = (select facility_id from profiles where id = auth.uid())
  );

create policy "phrase_bank_update" on phrase_bank
  for update using (
    facility_id = (select facility_id from profiles where id = auth.uid())
  );

-- daily_records: 自施設のみ
create policy "daily_records_select" on daily_records
  for select using (
    facility_id = (select facility_id from profiles where id = auth.uid())
  );

create policy "daily_records_insert" on daily_records
  for insert with check (
    facility_id = (select facility_id from profiles where id = auth.uid())
  );

create policy "daily_records_update" on daily_records
  for update using (
    facility_id = (select facility_id from profiles where id = auth.uid())
  );

create policy "daily_records_delete" on daily_records
  for delete using (
    facility_id = (select facility_id from profiles where id = auth.uid())
  );
