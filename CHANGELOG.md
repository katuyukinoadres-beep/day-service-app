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

### Added (事業所長ダッシュボード 請求準備ページ — Task 3 Slice 4)
- **[facility-admin /billing](https://day-service-facility-admin.vercel.app/billing) 新設**: 月次サービス提供実績の集計とエビデンス整合性チェック
  - 月選択（デフォルト前月）
  - KPI 3 件: 提供延べ日数 / 提供児童数 / エビデンス警告件数
  - 児童別月次テーブル（出席日数・記録完了数・警告件数、行クリックで警告フィルタ）
  - エビデンス警告パネル: 5 ルール検出 + 児童・ルール別フィルタ
    - **高**: 出席あり・記録なし / 記録空欄
    - **中**: 記録あり・出席なし / 来所/退所時刻欠落
    - **低**: 送迎手段欠落（`arrival_time` あるのに `pickup_method=NULL`）
  - CSV エクスポート 2 種: 出席日数（請求 SaaS 入力用）/ 警告詳細（運営指導エビデンス用）。BOM 付き UTF-8、Excel 直開き対応
- **`apps/facility-admin/src/components/layout/Sidebar.tsx` 改修**: 請求準備ナビの `disabled: true` 解除（準備中バッジ除去）
- **集計ロジックは pure function に分離**: `_lib/aggregateMonth.ts` `_lib/evidenceChecks.ts` `_lib/exportCsv.ts` — テスト追加時にユニット検証可能な構成
- **スコープ外**: 国保連請求フォーマット直接出力（SaaS 経由運用前提）、加算項目（児発加算・送迎加算等）の自動判定（次スライス検討）

### Added (事業所長ダッシュボード 児童分析ページ — Task 3 Slice 2)
- **[facility-admin /children](https://day-service-facility-admin.vercel.app/children) 新設**: 期間内の児童別活動・記録状況を可視化
  - 日付範囲ピッカー（デフォルト直近 28 日）
  - 児童セレクタ（すべて / 単一児童）
  - 施設全体 KPI 3 件: アクティブ児童数・期間内記録件数・期間内活動選択延べ数
  - **「すべて」ビュー**: 児童別テーブル（記録数・目標数・上位活動 Top 3）、行クリックで単一児童ビューへ
  - **「単一児童」ビュー**:
    - 個別目標リスト（`children.goals` をそのまま表示）
    - 活動頻度 Top 5 横棒グラフ（Tailwind、依存 0）
    - 週次記録数トレンド（過去 4 週、月曜起点の縦棒グラフ）
- **`apps/facility-admin/src/components/layout/Sidebar.tsx` 改修**: 児童分析ナビの `disabled: true` 解除（準備中バッジ除去）
- **チャートライブラリは不採用**: recharts 40KB 増を避け、インライン SVG + Tailwind で MVP 完結
- **スコープ外（Slice 2.5 以降に繰越）**: 個別目標の進捗スコアリング（`ai_text` / `notes` テキスト解析）、出欠率可視化、複数児童比較ビュー

### Added (オフライン読み取りキャッシュ — Phase B7 Slice 3)
- **IndexedDB による Stale-While-Revalidate 読み取りキャッシュ** を導入。オフライン時に児童一覧・当日の記録状況・活動項目・フレーズバンクが閲覧可能に
- 新規ファイル:
  - `apps/main/src/lib/readCache.ts`: `idb` ラッパー（DB `patto-read-cache` / store `entries`）。API: `readCache` / `writeCache` / `invalidate` / `invalidateByPrefix` / `clearReadCache` / `TTL` 定数
  - `apps/main/src/lib/useCachedQuery.ts`: SWR 風 hook。マウント時にキャッシュを即返し、並行でネットワーク更新。`online` イベントで自動 refetch。offline 時は cache のみ返して fetch スキップ
  - `apps/main/src/lib/useCurrentUserId.ts`: Supabase session から userId を同期的に取得。キャッシュ所有者キーに使用し、アカウント切替時の cross-account leak を防止
- **対象 4 クエリ**:
  - `children:active` (TTL 1日) — ホーム + 児童一覧画面の両方で同一キー共有
  - `daily_records:${today}` (TTL 5分) — ホームの当日記録状況
  - `phrase_bank:all` (TTL 1週間) — 記録入力画面
  - `activity_items:all` (TTL 1週間) — 記録入力画面
- **Invalidation フック**:
  - 児童編集/新規/非表示 → `children:active` を invalidate
  - `handleSave` / `handleMarkPaperLogged` → `daily_records:${today}` を invalidate
  - `offlineQueue.syncPending` 成功時 → `daily_records:${record.date}` を invalidate
- **オンラインフォールバック**: fetcher 失敗時もキャッシュデータは保持、UI を壊さない
- **Slice 4 以降の余地**: 履歴画面（日付フィルタ）キャッシュ、Quick templates、失敗エントリ可視化

### Added (オフライン書き込みキュー — Phase B7 Slice 2)
- **IndexedDB 書き込みキュー** で、オフライン中に職員が「下書き保存」「書き終えて次へ」を押しても記録が端末に退避し、通信復帰時に自動同期される
- 新規ファイル:
  - `apps/main/src/lib/offlineQueue.ts`: `idb` ラッパー（DB `patto-offline-queue` / store `pending_saves`）。API: `enqueueSave` / `getPendingCount` / `listPending` / `syncPending`
  - `apps/main/src/lib/useOfflineQueue.ts`: `navigator.onLine` + `online` イベント監視 hook、5秒ごとにカウント再取得、復帰時に自動 `syncPending`
- **`apps/main/src/app/record/[childId]/page.tsx` `handleSave` 改修**:
  - `daily_records.id` を `crypto.randomUUID()` で事前採番（activities 行との整合確保、復帰時の upsert が衝突しない）
  - `navigator.onLine === false` なら即キュー投入 + 「オフライン中です。保存は通信復帰時に自動実行されます」alert → 次児童遷移
  - オンライン検知されても fetch 失敗時は fallback でキュー投入（空港ラウンジ等の partial-online 対策）
- **`apps/main/src/components/OfflineBanner.tsx` 改修**: `useOfflineQueue` を参照、オフライン時は待機件数を併記、オンライン + 同期中/残件ありは青色バナー
- **dependency**: `idb ^8.0.3` を `apps/main` に追加（~2KB、Promise-based）
- **スコープ外（Slice 3 以降）**: 失敗エントリの可視化 UI、競合解決（現状は last-write-wins）、exponential backoff、複数端末間の同期
- **なぜ今**: Slice 1 で UI は整ったが、現場で「ネット断 → 保存しても消える」のリスクが残っていた。本番運用開始前の最後のオフライン実務ピース

### Added (児童管理番号 ⇔ h-navi userCode 3キー突合の第3キーを本番反映 — Phase B7.5 Slice 4)
- **DB マイグレーション** `018_children_h_navi_user_code.sql`: `children` に `h_navi_user_code TEXT` 追加（nullable）
  - 複合ユニーク `(facility_id, h_navi_user_code)` を部分インデックスで付与（NULL 除外、未入力児童の混在を許容）
  - 既存の氏名 + 生年月日 の 2 キー突合に、h-navi 側の `userCode` を「児童管理番号」として 3 キー目に追加
- **児童編集・新規登録フォーム**（`apps/main/src/app/(main)/children/[childId]/page.tsx` / `new/page.tsx`）: 「児童管理番号（h-navi 用）」Input を生年月日直下に配置、save/insert payload に含める
- **代表者ダッシュボード 転記画面**（`apps/facility-admin/src/app/(dashboard)/transcribe/page.tsx`）: 各行の児童名横に `#<userCode>` バッジ表示（未入力時は「管理番号 未設定」の警告バッジ）で目視突合を支援。`daily_records` → `children(name, h_navi_user_code)` join に h_navi_user_code を追加取得
- 代表者合意が 2026-04-21 に取れたため、本番運用前の最終ピースとして投入
- **スコープ外（Phase 2 Slice 2 で後回し）**: Chrome 拡張での h-navi 自動入力、サーバーサイド自動マッチング

### Changed (デフォルトフレーズを h-navi 実運用データ分析で再編 — Phase B9 Slice 1)
- **DB マイグレーション** `017_refresh_default_phrases.sql` 追加
  - h-navi 連絡帳 61 件（2026-03-23〜04-20 の 7 日分サンプル）を分析し、放デイの学習支援中心の運用に合わせてデフォルトフレーズを再編
  - **削除（3 件）**: 本文ヒット率が極端に低いもの
    - 「順番を守って活動できた」（認知・行動、4% ヒット）
    - 「「ありがとう」「ごめんね」が言えた」（言語、**0%**）
    - 「困っている友だちを助けられた」（人間関係、**0%**）
  - **追加（10 件）**: 本文ヒット率が高い放デイ特有表現
    - 認知・行動 +6: 「集中して最後までやり切った」「落ち着いて取り組めた」「丁寧に取り組めた」「意欲的に参加できた」「正確に解き進められた」「粘り強く頑張った」
    - 運動・感覚 +2: 「ビジョントレーニングに集中して取り組めた」「クロスウォークに楽しく取り組めた」
    - 言語・コミュニケーション +1: 「音読ではっきりした声で読めた」（ドキュメント出現率 36% で最頻出）
    - 人間関係・社会性 +1: 「お友だちと一緒に楽しく活動できた」
- 総数 21 → 28。施設固有フレーズ（`facility_id` NOT NULL）は保全。既存の `daily_records.phrases` 履歴も無変更
- 分析結果の詳細は `docs/DECISION_LOG.md` および Notion 知識DB に記録

### Changed (アプリ側転記コピーセクションを代表者ダッシュボードへ移管 — Phase B7.5 Slice 3)
- `apps/main` 記録入力画面から **「リタリコ等への転記用」セクションを撤去**（字数カウンタ・要約ボタン・日報まるごとコピー ボタン）
- 代わりに **青色の案内バナー** を配置：「リタリコへの転記は代表者ダッシュボードで一括処理されます。『書き終えて次へ』を押すと転記依頼として届きます」
- 現場職員の UI から転記系ワークフローが完全に消え、ぱっと記録の入力だけに集中できる
- 既存の `RitalicoCopyPanel` コンポーネント定義と `summarizing` state / `useProfile` 外側 hook は削除。`buildRitalicoDailyReport` と `/api/summarize-record` API 本体は代表者ダッシュボード側で再利用するため存続
- monorepo 全 `package.json` を `1.1.0-dev.24` に bump

### Added (代表者集約の転記ワークフロー — Phase B7.5 Slice 2)
- **DB マイグレーション** `016_transcribe_workflow.sql`: `daily_records` に `submitted_at` / `transcribed_at` の 2 カラムを追加
  - `submitted_at` NULL = 下書き / NOT NULL = 職員が「書き終えて次へ」で完了宣言
  - `transcribed_at` NULL = 転記待ち / NOT NULL = 代表者が h-navi 転記完了をマーク
  - 既存レコードは `submitted_at = updated_at` で埋める（過去分は全て提出済扱い）
  - 提出済かつ未転記レコード用のインデックス `idx_daily_records_awaiting_transcribe` 追加
- **アプリ側 2 ボタン化** (`apps/main/src/app/record/[childId]/page.tsx`)
  - **「書き終えて次へ（代表者に転記依頼）」**（primary）: `submitted_at = NOW()` で完了宣言 → 次の未記録児童へ遷移
  - **「下書き保存（この画面に留まる）」**（secondary）: `submitted_at` は変更せず、画面に留まる
  - 既存レコードが下書き状態（`submitted_at IS NULL`）のときは注意文 `⚠️ この記録はまだ下書き状態です` を表示
- **facility-admin** に `/transcribe` ページ新設
  - 日付選択 + 「未転記 / 転記済み / 下書き / すべて」フィルタ
  - 各行: 児童名 / 記録者名 / 提出時刻 / 文字数（500字超は amber） / 4ブロック プレビュー
  - 「転記用コピー」ボタン（クリップボード）/「h-navi 転記完了をマーク」ボタン
  - 「h-navi を別タブで開く」ショートカット
- **共通ヘルパ**: `buildRitalicoDailyReport` / `LITALICO_SOFT_LIMIT` を `@patto/shared` へ移設し main/facility-admin 両アプリで共有
- サイドバーに「リタリコ転記」メニュー項目追加
- monorepo 全 `package.json` を `1.1.0-dev.23` に bump

**⚠️ 適用手順**: `016_transcribe_workflow.sql` を Supabase に適用すること（Dashboard SQL Editor or CLI）。適用後に Vercel のデプロイが本機能を利用可能になる。

### Fixed (要約結果の二重出力修正 — Phase B7.5 Slice 1.5 hotfix)
- `/api/summarize-record` が 4ブロック全体ではなく **`aiText` 本文のみ**を圧縮する方式に変更（クライアント側で aiText 以外のオーバーヘッド字数を計算して動的に targetChars を逆算）
- Sonnet 4.6 のシステムプロンプトから「署名末尾保持」を削除し、「**見出し・署名を一切追加しない**」を明記。クライアントでは API 応答を `setAiText` に直接書き戻すだけ（抽出用正規表現を撤廃）
- 以前の実装では Sonnet が 4ブロックの見出しを省略して返した場合、fallback で全文が aiText に書き込まれ、【その他】と担当署名が重複して出力される不具合があった（dev.21 で発生、dev.22 で修正）
- monorepo 全 `package.json` を `1.1.0-dev.22` に bump

### Added (リタリコ転記コピー 500字ソフトリミット + AI 要約 — Phase B7.5 Slice 1.5)
- 「リタリコ等への転記用」パネルに **`{現在字数}/500字`** のカウンタを常時表示（超過時は amber ハイライト）
- **500字ソフトリミット超過時**: amber バナーで警告 + **「AIで要約する（約380字に）」** ボタンを表示（ハード上限なし、職員判断で超過保存は引き続き可能）
- 新規 API `POST /api/summarize-record`: **Claude Sonnet 4.6**（`claude-sonnet-4-6`）で本文を目標字数まで圧縮。Opus 4.7 よりコスト効率が高く、Haiku より文体・温度感保持が明確に高い
  - 入力: `{ text, targetChars?: number }`（デフォルト 380 字）
  - システムプロンプト: です・ます調厳守 / 段落構造保持 / 具体的エピソードの核を残す / 署名末尾保持 / 箇条書き禁止
  - 出力: 圧縮本文のみ（前置き・説明なし）
- 要約結果から【活動の様子】ブロックのみを抽出して `aiText` state に戻し、【取組内容】【その他】【担当】は自動再構築（活動数・特記事項の整合性維持）
- monorepo 全 `package.json` を `1.1.0-dev.21` に bump

### Changed (リタリコ h-navi 連絡帳 4ブロック構造準拠 — Phase B7.5 Slice 1)
- `buildRitalicoDailyReport` を h-navi 連絡帳「活動の様子」欄の実運用フォーマット（4ブロック構造）に全面書き換え
  - `【取組内容】 活動1／活動2／活動3`（スラッシュ区切り結合）
  - `【活動の様子】{aiText本文}`
  - `【その他】{特記事項}`
  - `担当：{記録者名}`（末尾署名、ログインユーザー名を自動付与）
- データ駆動 ON/OFF: 活動マスタ未選択なら【取組内容】省略、notes 空なら【その他】省略、recorderName 空なら担当署名省略
- 既存の【実施日】【児童名】【サービス提供時間】【気分】【送迎方法】はコピー出力から除外（h-navi の連絡帳テキストボックス貼付けに特化、実績側の項目は別画面で入力されるため）
- 関数引数から不要フィールド（date / childName / arrivalTime / departureTime / moodLabel / pickupMethod）を削除
- 背景: 2026-04-20 の h-navi 実機調査（Playwright MCP 経由、23件サンプル分析）で、嶋田 / 藤村 / 目賀田 / 坪庭 / 井手 の5担当者が実運用している文体を把握 → ぱっと記録の出力テンプレを現場運用に完全合致させる方針に確定
- monorepo 全 `package.json` を `1.1.0-dev.20` に bump

### Added (オフライン対応の基盤 — Phase B7 Slice 1)
- **Service Worker** `apps/main/public/sw.js` を追加し、初回アクセス後はアプリシェル（ホーム・オフラインページ・アイコン・manifest）を precache。ナビゲーションは network-first で動作し、失敗時はキャッシュ経由 → 最終フォールバックとして `/offline` ページを表示
- 静的アセット（`/_next/static/`、画像、CSS、JS、フォント）は cache-first で通信量を削減
- `/api/*` は intercept 対象外（後続 Slice で IndexedDB キュー経由のオフライン書き込みを実装予定）
- `/offline` ページを新設（ネットワーク未接続時の案内 + 再読み込みボタン）。共有 middleware で `/offline` を未認証でも閲覧可能に
- `<OfflineBanner />` を `(main)` layout に組込: `navigator.onLine` + `online/offline` イベントを監視し、切断時は画面上部に amber バナーを表示
- `<ServiceWorkerRegister />` を root layout に組込: 本番ビルドのみ `/sw.js` を自動登録。新バージョン検知時は `skipWaiting()` で即時反映
- monorepo 全 `package.json` を `1.1.0-dev.19` に bump

### Added (事業所長ダッシュボード `apps/facility-admin` 新設 — Phase B4-B5 Slice 1)
- モノレポに 3 つ目のアプリ `apps/facility-admin` を追加。事業所長（上田くん級）向けの可視化・意思決定ダッシュボード
- 認証: Supabase Auth（メール + パスワード）。`profiles.role = 'admin'` のアカウントのみアクセス可能。staff ロールは `/forbidden` ページへリダイレクト
- 退職処理済みアカウント（`is_active = false`）は強制ログアウト（`apps/main` と同じ UX）
- Sidebar 構成: ダッシュボード / 児童分析（準備中）/ スタッフ分析（準備中）/ 請求準備（準備中）/ 経営KPI（準備中）
- 機能① **リアルタイム業務状況** を Slice 1 で本実装:
  - 5 つの統計カード（記録済/在籍、未記録、紙記入、AI未生成、稼働スタッフ）
  - 記録進捗バー（`recordedCount / childrenActiveCount` の % 表示）
  - 児童別リスト 3 枠（未記録 / 紙記入 / AI未生成）
  - 「ぱっと記録」本体アプリへの外部リンク
- RLS 経由で自施設データのみにアクセス（`service_role` キー不使用、C 層 `apps/admin` とは認証方式が根本的に異なる）
- Vercel 用 `vercel.json` + `public/manifest.json` + アイコン配置。別プロジェクトとしてデプロイ想定
- root `package.json` に `dev:facility-admin` / `build:facility-admin` / `lint:facility-admin` スクリプト追加
- 残機能（児童分析・スタッフ分析・請求準備・経営KPI）は Slice 2-5 で順次実装
- monorepo 全 `package.json` を `1.1.0-dev.18` に bump

### Added (児童×期間データ出力機能)
- 新ページ `/documents/child-period-report` を追加
- 児童 + 開始日 + 終了日を指定して、該当期間の記録をまとめて閲覧・出力できる
- 利用者情報（氏名 / 生年月日 / 学校・学年）+ 件数 + 日付ごとのカード（気分・活動・特記事項・支援記録まとめ・送迎・記録者）を表示
- 「印刷 / PDF保存」ボタン（A4 縦、`window.print()`）
- 「CSV ダウンロード」ボタン（UTF-8 BOM 付き、Excel 直接開きで文字化けしない）
- 帳票メニュー一覧に「📅 児童×期間データ出力」を追加
- 紙記入日は「紙のフォームで記入済み」として別扱い
- monorepo 全 `package.json` を `1.1.0-dev.17` に bump

### Changed (履歴・帳票を `daily_record_activities` 正規化テーブル経由の読み出しへ移行)
- 履歴画面 / サービス提供記録帳票 / 業務日誌 / ホーム画面（先頭3件）/ Admin C層のダッシュボード・施設別記録一覧 の活動内容表示を、legacy `daily_records.activities text[]` から `daily_record_activities → activity_items` の join 読み出しへ切替
- 活動名は `activity_items.name` 現値を表示（マスタ改名が履歴に即反映）。`sort_order` で並び順を正規化
- 詳細欄（`daily_record_activities.detail`）は `名（詳細）` 形式でレンダリング
- 共通 formatter `formatActivitySelections` を `@patto/shared` に新設、主要 6 箇所で再利用
- 記録保存側は引き続き legacy `activities` カラムへの書き込みを並行継続（読み出しが全面切替できたら後続で書き込み停止 → カラム drop を検討）
- monorepo 全 `package.json` を `1.1.0-dev.16` に bump

### Changed (音声入力を continuous モード + 自動再開)
- `continuous: true` に変更。短い無音で勝手に終わらず、ユーザーがタップで停止するまで録音継続
- Chrome が continuous でも内部都合で onend を出すケースに備え、`keepAlive` フラグで自動再開
- `stop()` 呼び出し時と致命エラー（not-allowed / audio-capture / network）時は keepAlive=false にして再開ループを止める
- 各発話の final result ごとに `onAppend` が追記される
- monorepo 全 `package.json` を `1.1.0-dev.15` に bump

### Fixed (音声入力のウォッチドッグが録音中セッションを誤中断)
- dev.13 診断ログで判明: ウォッチドッグが `onaudiostart` でクリアされず、3秒経つと録音中のセッションを強制 `abort()` していた
- `onaudiostart` ハンドラで `clearWatchdog()` を呼ぶように修正
- ウォッチドッグ閾値を 3s → 8s（初回の permission prompt 待ちも許容）
- エラー文言を「マイク起動が遅い/拒否」に限定
- 真因: Web Speech API は正常動作。バグは Leon のウォッチドッグ実装側
- monorepo 全 `package.json` を `1.1.0-dev.14` に bump

### Fixed / Diagnostic (音声入力の再発バグ調査版)
- `VoiceInputButton` に以下を追加して 2回目以降失敗の真因を捕まえる:
  - **新インスタンス作成 per-start**（以前の persistent instance から再変更）+ **旧インスタンス明示 abort**
  - Microphone permission 状態の事前 probe
  - **全 SpeechRecognition イベントを logging**（onstart/onaudiostart/onspeechstart/onspeechend/onaudioend/onresult/onnomatch/onend/onerror）
  - **3秒ウォッチドッグ**: onaudiostart が来なければサイレント失敗と判定してエラー表示
  - 画面内「診断」ボタンで直近40イベントのタイムライン表示（ユーザーが DevTools なしで共有できる）
- 前回の「single persistent instance」方式は 2回目失敗を解消しなかったため per-start 方式へ戻した上で原因究明を優先
- monorepo 全 `package.json` を `1.1.0-dev.13` に bump

### Added (Phase B8b 完遂: 紙併用モードの機能実装)
- **「今日は紙で記入しました」ボタン** を記録入力画面に追加（`paper_mode_enabled=true` の施設のみ表示）
  - タップ → 確認ダイアログ → `daily_records` に空レコード+ `paper_logged=true` で insert（既存の通常記録がある場合は update で上書き）
  - 保存後は通常保存と同じく次の未記録児童へ自動遷移
- マイグレーション 015: `daily_records.paper_logged boolean default false` 追加
- 紙記入記録は **ホーム画面で「記録済」扱い**（進捗カウントに含まれる）。カードには 📝 紙で記入 表示 + 右端に「紙」バッジ
- 履歴画面: 紙記入カードは内容を「📝 紙のフォームで記入済み（アプリには内容なし）」表示 + 「紙で記入」バッジ
- 記録画面: 既存レコードが `paper_logged=true` の場合、ヘッダーに「紙で記入済み」バッジ + amber バナー表示。通常項目を埋めて「更新する」で普通の記録へ切替可能
- サービス提供記録帳票: 紙記入日は帳票生成せず「紙のフォームで記入済み」の案内文を表示
- `daily_records` の通常保存パスは `paper_logged=false` を明示的に送るため、紙→アプリ切替が一発で走る
- monorepo 全 `package.json` を `1.1.0-dev.12` に bump

### Changed (日報まるごとコピーに担当者名追加)
- `buildRitalicoDailyReport` 出力の【サービス提供時間】と【気分】の間に【担当者】行を挿入
- 担当者名は現在ログイン中ユーザーの `profiles.display_name` から取得（`useProfile` hook使用）
- リタリコへの転記で担当者情報が欠けていた問題を解消
- monorepo 全 `package.json` を `1.1.0-dev.10` に bump

### Added (Phase B8a フォローアップ: 退職時の強制ログアウト)
- ミドルウェア `packages/shared/src/supabase/middleware.ts` を拡張
  - 認証済みリクエスト時に `profiles.is_active` を確認、`false` なら `supabase.auth.signOut()` 実行して `/login?reason=deactivated` にリダイレクト
- ログイン画面にアンバー色の「このアカウントは無効化されました。管理者にお問い合わせください」バナーを表示（`?reason=deactivated` クエリ付きアクセス時）
- `useSearchParams` 使用のため `<Suspense>` ラッパー追加
- 従来 RLS で「空ページが見える」だけだったのを「ログアウト→案内表示」に改善
- monorepo 全 `package.json` を `1.1.0-dev.9` に bump

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
