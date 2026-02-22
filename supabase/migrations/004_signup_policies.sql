-- Phase 3: サインアップ用 RLS ポリシー
-- 新規ユーザーが施設を作成し、自分のプロフィールを作成できるようにする

-- 認証済みユーザーなら誰でも施設を作成可能（初回サインアップ時）
create policy "facilities_insert_authenticated" on facilities
  for insert with check (auth.uid() is not null);

-- 認証済みユーザーが自分自身のプロフィールを作成可能（id = auth.uid()）
create policy "profiles_insert_self" on profiles
  for insert with check (id = auth.uid());
