-- 017_refresh_default_phrases.sql
-- Phase B7.5 / Phase B9 — h-navi 実運用データ分析に基づくデフォルトフレーズの再編成
--
-- 背景:
--   2026-04-21 実施の h-navi 連絡帳 61件分析（2026-03-23〜04-20 の7日分サンプル）で
--   明らかになった頻出キーワードに合わせて、phrase_bank のデフォルトを再編する。
--
-- 方針（詳細は docs/DECISION_LOG.md 参照）:
--   - 放課後等デイサービスの学習支援中心の運用に合わせ、認知・行動カテゴリを 4→9 に拡充
--   - 放デイ特有の活動名（音読・ビジョン・クロスウォーク）をフレーズ化
--   - 本文 0% ヒットの冗長フレーズを削除
--
-- 影響範囲:
--   - is_default=true のシステム配布分のみを編集。施設固有フレーズ（facility_id IS NOT NULL）は保全
--   - text マッチで冪等に delete→insert（再実行でも破壊なし）
--   - 既存の daily_records.phrases (text[]) は触らない（保存済みの履歴は維持）

-- ============================================================
-- 1. 削除: 本文 0% ヒット or 学習中心運用と乖離する 3 件
-- ============================================================
DELETE FROM phrase_bank
WHERE is_default = true
  AND facility_id IS NULL
  AND text IN (
    '順番を守って活動できた',                 -- 認知・行動: 4% ヒットのみ、学習運用には不要
    '「ありがとう」「ごめんね」が言えた',       -- 言語: 本文 0% ヒット
    '困っている友だちを助けられた'              -- 人間関係: 本文 0% ヒット
  );

-- ============================================================
-- 2. 追加: h-navi 実運用で高頻出の 10 フレーズ
-- ============================================================
-- idempotent: 既に存在する text は SKIP（冗長挿入防止）
INSERT INTO phrase_bank (facility_id, category, text, domain_tags, sort_order, is_default)
SELECT NULL, category, text, domain_tags, sort_order, true
FROM (VALUES
  -- 認知・行動（+6、ドキュメント出現率順）
  ('認知・行動', '集中して最後までやり切った',           ARRAY['認知・行動']::text[], 5),
  ('認知・行動', '落ち着いて取り組めた',                   ARRAY['認知・行動']::text[], 6),
  ('認知・行動', '丁寧に取り組めた',                       ARRAY['認知・行動']::text[], 7),
  ('認知・行動', '意欲的に参加できた',                     ARRAY['認知・行動']::text[], 8),
  ('認知・行動', '正確に解き進められた',                   ARRAY['認知・行動']::text[], 9),
  ('認知・行動', '粘り強く頑張った',                       ARRAY['認知・行動']::text[], 10),

  -- 運動・感覚（+2、放デイ特有の活動名）
  ('運動・感覚', 'ビジョントレーニングに集中して取り組めた', ARRAY['運動・感覚']::text[], 4),
  ('運動・感覚', 'クロスウォークに楽しく取り組めた',           ARRAY['運動・感覚']::text[], 5),

  -- 言語・コミュニケーション（+1、最頻出の 音読）
  ('言語・コミュニケーション', '音読ではっきりした声で読めた',   ARRAY['言語・コミュニケーション']::text[], 5),

  -- 人間関係・社会性（+1）
  ('人間関係・社会性', 'お友だちと一緒に楽しく活動できた',     ARRAY['人間関係・社会性']::text[], 5)
) AS new_phrases(category, text, domain_tags, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM phrase_bank p
  WHERE p.is_default = true
    AND p.facility_id IS NULL
    AND p.text = new_phrases.text
);

-- ============================================================
-- 3. 検証用サマリ（適用後に確認する想定）
-- ============================================================
-- SELECT category, COUNT(*) AS cnt
-- FROM phrase_bank
-- WHERE is_default = true AND facility_id IS NULL
-- GROUP BY category
-- ORDER BY category;
--
-- 期待値:
--   認知・行動                  9
--   運動・感覚                  5
--   言語・コミュニケーション    4
--   人間関係・社会性            4
--   健康・生活                  5
--   合計                       27
