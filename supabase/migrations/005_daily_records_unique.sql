-- daily_records に child_id + date のUNIQUE制約を追加
-- 1児童1日1レコードをDB側で保証する
ALTER TABLE daily_records
  ADD CONSTRAINT daily_records_child_date_unique UNIQUE (child_id, date);
