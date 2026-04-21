-- 018_children_h_navi_user_code.sql
-- Phase B7.5 — 3キー突合の3つ目のキー（児童管理番号 / h-navi userCode）を children に追加
--
-- 背景:
--   ぱっと記録 → h-navi 連絡帳 転記時の児童特定は、これまで「氏名 + 生年月日」の
--   2キーで代表者が目視突合していた。同姓同名や同日生年月日の児童が混在した際に
--   誤貼付リスクが残る。h-navi 側で一意な userCode を「児童管理番号」として
--   ぱっと記録に保持し、将来的な Chrome 拡張自動入力（Phase 2 Slice 2）の
--   プライマリキーにも使う。
--
-- 方針:
--   - NULL 許容: 既存児童を破壊しない。施設側で順次入力運用
--   - facility_id + h_navi_user_code の複合ユニーク: 事業所内で重複不可、他事業所とは独立
--   - 部分インデックス WHERE NULL 除外: 未入力児童が多数あっても重複チェック対象外
--   - 既存 RLS ポリシーは children 単位で閉じているため、列追加のみで追加ポリシー不要

ALTER TABLE children
  ADD COLUMN IF NOT EXISTS h_navi_user_code TEXT;

COMMENT ON COLUMN children.h_navi_user_code IS
  '児童管理番号 / h-navi userCode — Phase B7.5 3キー突合用（氏名・生年月日・本列）';

CREATE UNIQUE INDEX IF NOT EXISTS children_facility_h_navi_user_code_unique
  ON children(facility_id, h_navi_user_code)
  WHERE h_navi_user_code IS NOT NULL;
