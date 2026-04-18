# CLAUDE.md - day-service-app

## プロジェクト概要
放課後等デイサービス支援記録アプリ「ぱっと記録」のモノレポ。

**設計哲学（北極星）**: 「放デイ職員の手間を最小化し、子供と向き合う時間を最大化する」

## 3層アーキテクチャ（NiKo ビジョン）
| 層 | アプリ | 主な利用者 | 状態 |
|---|--------|-----------|------|
| **A** | `apps/main` | 現場スタッフ／保護者 | ✅ 実装済 |
| **B** | `apps/facility-admin` | 事業所長（上田くん級） | 🔲 Phase 1.2 で追加予定 |
| **C** | `apps/admin` | スーパー管理者（Leon／開発側） | ✅ 実装済 |

> ⚠️ `apps/admin` は C（システムAdmin）。B（施設管理者ダッシュボード）とは別物。混同しないこと。

## 構成
- `apps/main` - A層: ユーザーアプリ（Next.js 16 / React 19）
- `apps/admin` - C層: システムAdmin管理画面（Next.js 16 / React 19）
- `apps/facility-admin` - B層: 施設管理者ダッシュボード（🔲 Phase 1.2 で追加予定）
- `packages/shared` - 共有ライブラリ（型定義、Supabaseクライアント、定数）
- `docs/` - 設計ドキュメント一式（11ファイル、v1.1.0 spec-reset で全面改訂）
- `CHANGELOG.md` - 変更履歴（SemVer準拠）

## 技術スタック
- Next.js 16.1.6 / React 19.2.3 / TypeScript 5
- Supabase（PostgreSQL + Auth + RLS）
- Anthropic SDK（Claude API / AI記録生成）
- Tailwind CSS 4
- Vercel（ホスティング）

## よく使うコマンド
```bash
npm run dev:main          # メインアプリ開発サーバー (port 3000)
npm run dev:admin         # 管理画面開発サーバー (port 3001)
npm run build:main        # メインアプリビルド
npm run build:admin       # 管理画面ビルド
npm run lint:main         # メインアプリLint
npm run lint:admin        # 管理画面Lint
npx vercel --prod --yes   # 本番デプロイ（ルートから実行）
```

## 環境変数
| 変数名 | 用途 | スコープ |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | クライアント + サーバー |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase匿名キー | クライアント + サーバー |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabaseサービスロールキー | サーバーのみ |
| `ANTHROPIC_API_KEY` | Claude API キー | サーバーのみ |
| `ADMIN_PASSWORD` | 管理画面パスワード | サーバーのみ |

## DB構成（Supabase PostgreSQL）
| テーブル | 説明 | 主なカラム | 状態 |
|---|---|---|---|
| `facilities` | 施設 | name, is_active, plan | 既存 |
| `profiles` | ユーザー | facility_id, display_name, role(admin/staff) | 既存 |
| `children` | 児童 | facility_id, name, birth_date, domain_tags[] | 既存 |
| `daily_records` | 日次記録 | child_id, date, mood, ai_text | 既存（Phase B1で `topics`/`notes` カラム追加、`activities` 廃止予定） |
| `attendances` | 出席 | child_id, date, is_present | 既存 |
| `phrase_bank` | フレーズ | category, text, domain_tags[] | 既存 |
| `activity_items` | 活動マスタ | facility_id, name, has_detail_field, is_active | 🔲 Phase B1 で追加予定 |
| `daily_record_activities` | 日次記録×活動 | daily_record_id, activity_item_id, detail | 🔲 Phase B1 で追加予定 |

※ RLS（Row Level Security）で施設単位のデータ分離

## デプロイ
- メインアプリ: `day-service-app.vercel.app`
- Vercelプロジェクト設定: `.vercel/project.json` にリンク済み
- ルートディレクトリから `npx vercel --prod --yes` で実行

## バージョニング
- **Single source of truth**: root `package.json` の `version` フィールド
- **SemVer運用**: major（破壊的変更）/ minor（機能追加）/ patch（修正・改善）
- **表示**: 設定画面下部に `v{version} ({shortSha})` を表示（`VersionBadge` コンポーネント）
- **注入**: `apps/main/next.config.ts` でビルド時に `NEXT_PUBLIC_APP_VERSION` と `NEXT_PUBLIC_COMMIT_SHA` を環境変数として設定
- **リリース手順**:
  1. featureブランチで機能実装
  2. root + 各 workspace の `package.json` の version を bump（全て同じバージョンに揃える）
  3. `CHANGELOG.md` に変更を追記（Added / Changed / Fixed 等のカテゴリ別）
  4. PR → マージ → 本番デプロイ
  5. `CHANGELOG.md` で各バージョンのリリース日を記録

## ドキュメント更新対象（自動実行フローのステップ3で使用）
- `docs/01_要件定義書.md` - 機能要件に変更がある場合
- `docs/02_画面設計書.md` - UI変更がある場合
- `docs/03_DB設計書.md` - DB変更がある場合
- `docs/04_技術設計書.md` - アーキテクチャ変更がある場合
- `docs/05_テスト仕様書.md` - テストケース追加・変更が必要な場合
- `docs/06_API設計書.md` - API変更がある場合
- `docs/07_セキュリティ設計書.md` - セキュリティに影響する場合
- `docs/08_インフラ構成書.md` - インフラ変更がある場合
- `docs/09_UI詳細仕様書.md` - コンポーネント・画面の詳細UI変更がある場合
- `docs/10_ビジネスロジック仕様書.md` - ビジネスルール・ワークフロー変更がある場合
- `docs/11_環境構築手順書.md` - 環境構築・依存関係に変更がある場合

## 注意事項
- `apps/main` 単体からの `vercel` デプロイは失敗する（モノレポのためルートから実行）
- daily_records は (child_id, date) でユニーク制約あり
- phrase_bank の facility_id が NULL のレコードはデフォルトフレーズ（全施設共通）
