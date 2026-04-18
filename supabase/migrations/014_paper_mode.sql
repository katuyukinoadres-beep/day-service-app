-- Phase B8b: 紙併用モード（2週間移行期用の施設設定フラグ）
-- 紙→アプリ切替のリスクを下げるため、紙で記入してもよい期間を明示的に設定できるようにする

alter table facilities
  add column if not exists paper_mode_enabled boolean not null default false;

comment on column facilities.paper_mode_enabled is '紙併用モード: 移行期に紙でも記入OK とする運用期間中は true。ホーム/記録入力画面に案内を表示';
