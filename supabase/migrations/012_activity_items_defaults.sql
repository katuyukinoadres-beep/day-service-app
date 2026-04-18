-- Phase B3: activity items defaults seeding
-- 上田くん施設の紙フォーム準拠の活動項目を全施設に投入
-- 既存施設バックフィル + 新規 facilities insert トリガーで自動投入

-- ============================================================
-- 既定活動項目定義関数（idempotent）
-- facility が該当 field の項目を1件も持っていない場合のみ投入
-- ============================================================
create or replace function seed_default_activity_items(p_facility_id uuid)
returns void as $$
begin
  if exists (select 1 from activity_items where facility_id = p_facility_id) then
    return;
  end if;

  insert into activity_items (facility_id, name, sort_order, has_detail_field, is_active) values
    (p_facility_id, '眼球運動', 1, false, true),
    (p_facility_id, '宿題', 2, false, true),
    (p_facility_id, '漢字トレーニング', 3, true, true),
    (p_facility_id, '計算トレーニング', 4, true, true),
    (p_facility_id, 'その他取り組み', 5, true, true);
end;
$$ language plpgsql security definer;

-- ============================================================
-- 既存施設全てにバックフィル
-- ============================================================
do $$
declare
  f record;
begin
  for f in select id from facilities loop
    perform seed_default_activity_items(f.id);
  end loop;
end $$;

-- ============================================================
-- 新規 facilities insert 時に自動シードするトリガー
-- ============================================================
create or replace function trigger_seed_default_activity_items()
returns trigger as $$
begin
  perform seed_default_activity_items(new.id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists facilities_seed_activity_items on facilities;
create trigger facilities_seed_activity_items
  after insert on facilities
  for each row
  execute function trigger_seed_default_activity_items();
