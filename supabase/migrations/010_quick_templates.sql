-- Phase 1.1 spec-reset: quick templates for topics / notes fields
-- 活動中のトピックス・特記事項にクイック入力用のテンプレートを追加
-- ユーザー（先生）ごとにカスタマイズ可能、tap-to-append で本文に追記する運用

-- ============================================================
-- クイックテンプレート（ユーザーごと、field_type で topics/notes を区別）
-- ============================================================
create table quick_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  field_type text not null check (field_type in ('topics', 'notes')),
  text text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_quick_templates_user_field
  on quick_templates (user_id, field_type, is_active, sort_order);

-- updated_at 自動更新トリガー
create or replace function update_quick_templates_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger quick_templates_updated_at
  before update on quick_templates
  for each row
  execute function update_quick_templates_updated_at();

-- ============================================================
-- RLS 有効化
-- ============================================================
alter table quick_templates enable row level security;

-- ============================================================
-- RLS ポリシー: quick_templates（自分のテンプレのみ CRUD 可）
-- ============================================================

create policy "quick_templates_select" on quick_templates
  for select using (user_id = auth.uid());

create policy "quick_templates_insert" on quick_templates
  for insert with check (user_id = auth.uid());

create policy "quick_templates_update" on quick_templates
  for update using (user_id = auth.uid());

create policy "quick_templates_delete" on quick_templates
  for delete using (user_id = auth.uid());
