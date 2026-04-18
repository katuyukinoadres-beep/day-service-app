-- Phase 1.1 spec-reset: free text field split (topics / notes)
-- 紙フォームの「活動中のトピックス」と「特記事項」を個別に記録可能にする
-- 既存の memo カラムは後方互換のため残置、新規記録では topics/notes を使用

-- ============================================================
-- daily_records に topics / notes カラムを追加
-- ============================================================
alter table daily_records
  add column if not exists topics text,
  add column if not exists notes text;

comment on column daily_records.topics is '活動中のトピックス（紙フォーム準拠、フリー記述、音声入力対応予定）';
comment on column daily_records.notes is '特記事項（紙フォーム準拠、フリー記述、音声入力対応予定）';
comment on column daily_records.memo is '【廃止予定】自由記述メモ。後方互換のため残置。新規記録では topics/notes を使用';
