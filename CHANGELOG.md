# Changelog

ぱっと記録（Patto Kiroku）の主要な変更を記録する。

フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に準拠。
バージョニングは [Semantic Versioning](https://semver.org/lang/ja/) に従う。

カテゴリ:
- **Added**: 新機能
- **Changed**: 既存機能の変更
- **Deprecated**: 将来削除予定の機能
- **Removed**: 削除された機能
- **Fixed**: バグ修正
- **Security**: セキュリティに関する修正

---

## [Unreleased]

### Added (Phase B8b: 紙併用モード)
- `facilities.paper_mode_enabled boolean default false` カラム追加（マイグレーション 014）
- 施設設定画面 `/settings/facility` に紙併用モードトグル追加（admin のみ操作可）
- ホーム画面に紙併用モード案内バナー表示（有効時のみ、amber系の目立たない色で常設）
- 用途: 紙→アプリ切替の移行期（推奨2週間）に「紙でも OK」を明示、現場の心理的負担を軽減
- 切替操作: 全員の習熟後に admin が OFF へ戻してデジタル必須運用へ移行
- monorepo 全 `package.json` を `1.1.0-dev.8` に bump

### Fixed (活動中のトピックスも最終出力から除外)
- 活動中のトピックス（topics）も記録フレーズ同様、AI生成の入力ヒントに位置づけ。最終出力から除外
- `buildRitalicoDailyReport`（日報まるごとコピー）から「【活動中のトピックス】」セクション削除
- サービス提供記録帳票 DOC-002 から 活動中のトピックス 行削除
- 履歴画面 `/history` から 活動中のトピックス 表示を削除
- 記録入力画面でのトピックス入力 + クイック入力テンプレート + 音声入力 はそのまま機能（AI入力ヒントとして動作）
- AI生成プロンプトには引き続き topics を渡す（入力ヒントとしての役割は維持）
- monorepo 全 `package.json` を `1.1.0-dev.7` に bump

### Added (Phase B8a: スタッフ退職時の即時アカウント遮断)
- `profiles` テーブルに `is_active boolean default true` カラム追加（マイグレーション 013）
- 関連RLSポリシー群を更新: `profiles.is_active = false` のユーザーは所属施設データ（children/daily_records/activity_items 等）への SELECT/INSERT/UPDATE/DELETE を全面遮断
- スタッフ管理画面 `/settings/staff` にセクション分離表示:
  - 有効なスタッフ（ロール変更・退職処理可）
  - 退職処理済（半透明 + 「退職処理済」ラベル + 復帰ボタン）
- 「退職」ボタン: 確認ダイアログ後に `is_active = false`、施設データアクセスが即時遮断（過去記録は維持）
- 「復帰」ボタン: `is_active = true` に戻す（誤操作の救済）
- **BYOD前提の必須要件 AUTH-006 を実装**。退職者の個人スマホから即座に施設情報を見られなくする
- 注: quick_templates はユーザー個別データのため、退職時は自分のテンプレへのアクセスも遮断される
- monorepo 全 `package.json` を `1.1.0-dev.6` に bump

### Fixed (記録フレーズを最終出力から除外)
- 記録フレーズは AI への入力ヒント（AI支援記録まとめ生成用）であり、最終出力（外部配布物）には含めないという原則を実装で徹底
- `buildRitalicoDailyReport`（B3a の日報まるごとコピー）から 記録フレーズ セクション削除
- サービス提供記録帳票（DOC-002、国保連エビデンス）から 記録フレーズ 行削除
- 履歴画面（`/history`）から 記録フレーズ 表示を削除
- monorepo 全 `package.json` を `1.1.0-dev.5` に bump

### Added (Phase B3a: リタリコ向けコピー最適化)
- 議事録アクションアイテム「コピペ自動化機能設計」の第1弾
- `CopyButton` コンポーネント新設（Clipboard API + 古いブラウザ用 textarea フォールバック、成功/失敗フィードバック付き）
- 記録入力画面に2種のコピーボタンを配置:
  - **「記録まとめだけコピー」**: AI生成テキストのみ（親への情報共有用などピンポイント貼り付けに）
  - **「日報まるごとコピー」**: 実施日/児童名/時間/気分/活動内容+詳細/フレーズ/トピックス/特記事項/支援記録まとめ/送迎方法を日報フォーマットで一括（リタリコ等の単一テキストエリアに貼り付けて使う想定）
- 上田くん手動コピペ作業の負荷を即効で軽減。将来 Phase B7.5 で Chrome 拡張 / Coact / MCP 等による完全自動化へ
- monorepo 全 `package.json` を `1.1.0-dev.4` に bump

### Changed (Phase B3: 記録入力を活動マスタに切替)
- 記録入力画面の活動内容を、ハードコード9項目 enum（工作/運動/学習/…）から**施設カスタマイズの活動マスタ**に切替
- 活動項目が `has_detail_field = true` の場合、選択時にインラインで詳細記入欄を展開（例: 漢字トレーニング→「三文字熟語」）
- 保存時は `daily_record_activities` 連結テーブルに `{daily_record_id, activity_item_id, detail}` を永続化
- 後方互換: `daily_records.activities text[]` にも「項目名（詳細）」形式で書き込み、履歴・帳票表示の既存コードを維持
- AI記録生成プロンプトにも詳細付きの活動名を渡す
- 活動マスタ未登録の施設向けに「設定 &gt; 活動マスタ管理 から追加してください」の空状態メッセージ

### Added (マイグレーション 012: activity_items デフォルト)
- 関数 `seed_default_activity_items(facility_id)`: 紙フォーム準拠の5項目を投入（眼球運動 / 宿題 / 漢字トレーニング〈詳細〉/ 計算トレーニング〈詳細〉/ その他取り組み〈詳細〉）
- 既存施設へのバックフィル + `facilities` insert トリガーによる新規自動シード
- Idempotent: 1件以上の項目がある施設には再投入しない

### Added (Phase B6: 音声入力)
- `VoiceInputButton` コンポーネント新設。Web Speech API (SpeechRecognition) ベース
- 記録入力画面の「活動中のトピックス」「特記事項」ラベル右に配置、タップで録音開始→停止で本文に追記
- 対応状況: Chrome / Safari / Edge（Android/iOS 主要モバイルブラウザで動作）。非対応ブラウザではボタン非表示
- 日本語（ja-JP）認識に設定、非連続モード（1発話で完結、再度タップで追加入力）
- エラー表示: マイク拒否、音声未検出、その他 SpeechRecognition エラーを画面にフィードバック
- monorepo 全 `package.json` を `1.1.0-dev.2` に bump

### Fixed (version + commit SHA 反映)
- `apps/main/next.config.ts` で `VERCEL_GIT_COMMIT_SHA` 未設定時に `git rev-parse --short HEAD` を読むフォールバックを追加。CLI デプロイでも正しい SHA が表示されるように
- monorepo 全 `package.json` を `1.1.0-dev.1` に bump（Phase B1〜B2a の実装を反映）
- 以降 Phase B 系の PR ごとに pre-release identifier（`-dev.N`）を繰り上げていき、Phase B が全部揃ったら `1.1.0` で正式リリース予定

### Fixed (Phase B2a fix: テンプレート追加エラーとデフォルト不在)
- `/settings/quick-templates/new` の保存失敗時に画面に何も出ないバグを修正（エラー表示とログを追加、`useProfile` 未ロード時に保存ボタンが無反応になる問題の原因も除去）
- マイグレーション 011 追加: 既定テンプレートを全ユーザーに自動投入
  - topics (6件): 集中して取り組めました / お友達と仲良く遊びました / 笑顔が見られました / 自分から声をかけていました / 最後まで頑張りました / 落ち着いて過ごせました
  - notes (6件): 保護者連絡予定 / 怪我なし / 体調良好 / 服薬確認済み / 送迎時間変更あり / 忘れ物あり
- 既存ユーザー全員へバックフィル + `profiles` insert トリガーで新規ユーザーにも自動適用
- シード関数はidempotent（該当 field_type が0件のユーザーにのみ挿入）

### Added (Phase B2a: クイック入力テンプレート)
- `quick_templates` テーブル新設（マイグレーション 010）。ユーザー（先生）ごとに作成、`field_type` で topics/notes を区別、論理削除対応
- RLS ポリシー: 自分のテンプレのみ CRUD 可（他の先生からは見えない）
- `packages/shared/src/types/database.ts` に `QuickTemplate` 型追加
- 設定画面に「クイック入力テンプレート」メニューを追加（全ユーザー、個人設定）
- `/settings/quick-templates` ページ: topics/notes を分けて一覧表示、セクションごとに追加可能
- `/settings/quick-templates/new` ページ: 新規テンプレート追加（`?type=topics|notes` でプリセット可）
- `/settings/quick-templates/[templateId]` ページ: 編集・有効/無効・削除
- 記録入力画面の「活動中のトピックス」「特記事項」欄にクイック入力ボタン（チップ）を配置、タップで本文に追記（既存入力がある場合は改行区切りで追加）

### Changed (Phase B2: フリー記述欄を紙フォーム準拠で分離)
- `daily_records` テーブルに `topics`（活動中のトピックス）と `notes`（特記事項）カラムを追加（マイグレーション 009）
- 記録入力画面の「メモ」欄を「活動中のトピックス」「特記事項」の2つの独立した欄に分離
- 履歴画面・サービス提供記録帳票出力を新フォーマットで表示するよう更新
- AI記録生成プロンプトを新フォーマット（topics/notes）に対応。旧 memo はフォールバックとして後方互換サポート
- 旧 `memo` カラムは残置（コメントで廃止予定を明記）。新規保存時は `memo = null` でクリア

### Migration notes
- `daily_records.activities text[]` は Phase B3 で新マスタへ切替予定、現時点では未変更
- 既存記録（v1.0.0 まで）の `memo` 内容は記録編集時に `notes` へ自動移行表示され、保存で新フォーマット化される

### Added (Phase B1: 活動マスタ化)
- `activity_items` テーブルを新設（施設ごとの活動項目マスタ、`has_detail_field` フラグ、論理削除対応）
- `daily_record_activities` 連結テーブルを新設（日次記録と活動項目のN:N連結、詳細記入内容を格納）
- マイグレーション `008_activity_items_tables.sql` を追加（両テーブル + RLS ポリシー）
- `packages/shared/src/types/database.ts` に `ActivityItem` / `DailyRecordActivity` 型を追加
- 設定画面に「活動マスタ管理」メニューを追加（admin のみ表示、`SET-005`）
- `/settings/activities` ページ: 有効・廃止済みリスト表示
- `/settings/activities/new` ページ: 新規追加フォーム（名称、表示順、詳細記入欄フラグ）
- `/settings/activities/[activityId]` ページ: 編集 + 廃止・復元（物理削除は不可、過去記録の整合性保持）

### Note
- 既存の `daily_records.activities text[]` カラムは後方互換のため残置。新規記録入力UI は後続PR（Phase B3）で新マスタを使うよう切替予定。
- 上田くん施設の初期活動項目（眼球運動・宿題・漢字トレーニング等）は本PRでは自動投入しない。デプロイ後、admin がUI経由で登録するか、SQL エディタ経由でシードを実行する運用。

### Changed (spec-reset)
- **NiKo ビジョン整合のため仕様書群を全面改訂**。2026-04-18 受領の「放デイ業務改善プロジェクト NiKo→Leon 引き渡しパッケージ」に基づき、Phase 1.1 の実証施設（上田くん運営、株式会社ピース）の要件を docs に反映
- `docs/01_requirements.md`:
  - 冒頭に「設計哲学 7か条」セクションを新設
  - 「対象施設と前提条件」セクションを新設（Q&A 10項目の回答を制約条件化）
  - 3層アーキテクチャ（A/B/C）を明示、B 層（施設管理者ダッシュボード）未実装を明記
  - Phase ロードマップ（1.1/1.2/1.3/2/3）を記載、ハイブリッド戦略（自作×SaaS）を反映
  - Phase 1.1 コア機能を「紙フォーム忠実版」に再定義（活動マスタ化、フリー欄分離）
  - BYOD前提の退職時即時無効化（AUTH-006）、軽オフライン耐性（REC-010）、音声入力（REC-009）、下書き自動保存（REC-008）、紙併用モード（MIG-001）、活動マスタ管理（SET-005）を必須要件に追加
- `docs/02_architecture.md`:
  - システムコンテキスト図に3層構成を反映
  - リポジトリ構成に `apps/facility-admin` 追加予定を記載
  - ADR-005（3層アーキテクチャ）、ADR-006（活動マスタ化）を追加
- `docs/03_database.md`:
  - §9 として Phase 1.1 予定スキーマ変更を追記（`activity_items` / `daily_record_activities` 新設、`daily_records` の `topics`/`notes` カラム追加、`activities text[]` 廃止）
  - ER図に Phase 1.1 完了時の想定を追加
- `docs/09_business_logic.md`:
  - ドメイン領域に「活動マスタ管理」「紙フォーム整合性」を追加
  - §6「紙フォーム整合性ルール」を新設（ACT-R*, FREE-R*, UI-R*, MIG-R*, BYOD-R* の各ルール群）
- `CLAUDE.md` / `00_README.md` にも3層アーキテクチャと設計哲学を反映

### 実装移行計画
本 Unreleased セクションはドキュメント整合のみ。Phase B1〜B8 で段階的にコード実装・マイグレーション適用予定。

## [1.0.0] - 2026-04-18

初の SemVer 準拠リリース。

### Added
- **アプリバージョン表示**: 設定画面下部に `v{version} ({shortSha})` 形式でアプリバージョンとコミットSHAを表示
- ルート `package.json` の `version` を single source of truth とし、ビルド時に `NEXT_PUBLIC_APP_VERSION` として注入
- Vercel 環境変数 `VERCEL_GIT_COMMIT_SHA` を短縮（7文字）して `NEXT_PUBLIC_COMMIT_SHA` として注入
- `CHANGELOG.md` 新設。以降リリースごとに変更履歴を記録

### Changed
- **AI記録生成モデルを Claude Opus 4.7 にアップグレード**（旧: Claude Sonnet 4.5 / `claude-sonnet-4-5-20250929` → 新: Claude Opus 4.7 / `claude-opus-4-7`）
  - 放課後デイ業務改善プロジェクトの設計哲学「職員負荷最小化／子供時間最大化」に照らし、AI生成品質 = 職員の手直し時間削減に直結するためモデル強化を判断
  - 支援記録文は国保連エビデンス（公式書類）のため品質が業務価値に直結
  - 予算制約なしと確定済みのためコスト最適化の判断軸を外して品質優先
  - 関連docs同期: `01_requirements.md` / `02_architecture.md` / `04_api.md` / `07_infrastructure.md` / `09_business_logic.md`
- monorepo内全 `package.json` のバージョンを `1.0.0` に統一（root / `@patto/main` / `@patto/admin` / `@patto/shared`）
