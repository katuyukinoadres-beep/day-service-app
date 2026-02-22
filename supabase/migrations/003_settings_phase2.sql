-- Phase 2: 設定機能追加 RLS ポリシー

-- 管理者のみ自施設を更新可能
create policy "facilities_update_admin" on facilities
  for update using (
    id = (select facility_id from profiles where id = auth.uid())
    and exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 管理者が同施設の他スタッフの role を変更可能
create policy "profiles_admin_update" on profiles
  for update using (
    facility_id = (select facility_id from profiles where id = auth.uid())
    and exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 自施設のカスタムフレーズ（is_default=false）を削除可能
create policy "phrase_bank_delete" on phrase_bank
  for delete using (
    is_default = false
    and facility_id = (select facility_id from profiles where id = auth.uid())
  );
