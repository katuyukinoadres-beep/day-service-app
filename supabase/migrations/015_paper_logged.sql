-- Phase B8b 完遂: 紙併用モード時の「今日は紙で記入しました」記録
--
-- 紙で記入した日は daily_records に空レコードを挿入し paper_logged = true を立てる。
-- これによりホーム画面で「未記録」扱いから外し、進捗カウントを正しく反映する。
-- 履歴/帳票側は paper_logged=true のレコードを「紙記入」バッジ表示 + 日報まるごとコピー
-- やサービス提供記録から除外する（内容がないため）。

alter table daily_records
  add column if not exists paper_logged boolean not null default false;

comment on column daily_records.paper_logged is
  '紙で記入した旨を示すフラグ。true の場合は内容フィールドは空、ホームで記録済扱い、帳票・日報コピーからは除外';

-- 既存行は全て false のまま（紙記入フラグを過去データに遡って付けない）
