-- Phase B2a fix: default quick templates seeding
-- 既存ユーザー全員＋新規ユーザー自動投入のためのシード関数・バックフィル・トリガー

-- ============================================================
-- 既定テンプレート定義関数（idempotent）
-- ユーザーが該当 field_type のテンプレートを1件も持っていない場合のみ投入
-- ============================================================
create or replace function seed_default_quick_templates(p_user_id uuid)
returns void as $$
declare
  topics_defaults text[] := array[
    '集中して取り組めました',
    'お友達と仲良く遊びました',
    '笑顔が見られました',
    '自分から声をかけていました',
    '最後まで頑張りました',
    '落ち着いて過ごせました'
  ];
  notes_defaults text[] := array[
    '保護者連絡予定',
    '怪我なし',
    '体調良好',
    '服薬確認済み',
    '送迎時間変更あり',
    '忘れ物あり'
  ];
  i int;
begin
  -- topics 初期テンプレ（該当ユーザー x topics が0件の場合のみ）
  if not exists (
    select 1 from quick_templates
    where user_id = p_user_id and field_type = 'topics'
  ) then
    for i in 1..array_length(topics_defaults, 1) loop
      insert into quick_templates (user_id, field_type, text, sort_order, is_active)
      values (p_user_id, 'topics', topics_defaults[i], i, true);
    end loop;
  end if;

  -- notes 初期テンプレ（該当ユーザー x notes が0件の場合のみ）
  if not exists (
    select 1 from quick_templates
    where user_id = p_user_id and field_type = 'notes'
  ) then
    for i in 1..array_length(notes_defaults, 1) loop
      insert into quick_templates (user_id, field_type, text, sort_order, is_active)
      values (p_user_id, 'notes', notes_defaults[i], i, true);
    end loop;
  end if;
end;
$$ language plpgsql security definer;

-- ============================================================
-- 既存ユーザー全員にバックフィル
-- ============================================================
do $$
declare
  p record;
begin
  for p in select id from profiles loop
    perform seed_default_quick_templates(p.id);
  end loop;
end $$;

-- ============================================================
-- 新規プロフィール作成時に自動シードするトリガー
-- ============================================================
create or replace function trigger_seed_default_quick_templates()
returns trigger as $$
begin
  perform seed_default_quick_templates(new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger profiles_seed_quick_templates
  after insert on profiles
  for each row
  execute function trigger_seed_default_quick_templates();
