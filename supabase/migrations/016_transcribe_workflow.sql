-- 016_transcribe_workflow.sql
-- Phase B7.5 Slice 2 — ぱっと記録 ⇔ リタリコ転記ワークフロー
--
-- daily_records に 2 つのタイムスタンプカラムを追加:
--   submitted_at   : 職員が「書き終えて次へ」を押した時刻（null なら下書き中）
--   transcribed_at : 代表者が facility-admin で h-navi 転記完了をマークした時刻
--
-- 状態遷移:
--   下書き         : submitted_at IS NULL
--   提出済（転記待ち）: submitted_at IS NOT NULL AND transcribed_at IS NULL
--   転記済         : submitted_at IS NOT NULL AND transcribed_at IS NOT NULL
--
-- 既存レコードは updated_at をそのまま submitted_at として埋め、過去分は全て「提出済み扱い」にする。
-- 紙併用モードで記入された記録（paper_logged=true）も同様に提出済み扱い。
-- 本マイグレーション後、新規レコードは明示的に submitted_at がセットされるまで下書き状態になる。

ALTER TABLE daily_records
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS transcribed_at TIMESTAMPTZ;

-- 既存レコードを一括で提出済み扱いに更新（updated_at をそのまま submitted_at に）
UPDATE daily_records
SET submitted_at = COALESCE(updated_at, created_at)
WHERE submitted_at IS NULL;

-- 提出済かつ未転記のレコードを代表者ダッシュボードで素早く引くためのインデックス
CREATE INDEX IF NOT EXISTS idx_daily_records_awaiting_transcribe
  ON daily_records (submitted_at)
  WHERE submitted_at IS NOT NULL AND transcribed_at IS NULL;

COMMENT ON COLUMN daily_records.submitted_at IS
  '職員が「書き終えて次へ」を押した時刻。NULL=下書き。代表者の /transcribe 画面は NOT NULL のレコードだけを表示する。';
COMMENT ON COLUMN daily_records.transcribed_at IS
  '代表者がリタリコ h-navi への転記完了を手動マークした時刻。NULL=転記待ち。自動転記（Phase 3）実装時は Chrome 拡張／サーバからもセットされる。';
