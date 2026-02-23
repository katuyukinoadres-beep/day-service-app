# CLAUDE.md - day-service-app

## プロジェクト概要
放課後等デイサービス支援記録アプリ「ぱっと記録」のモノレポ。

## 構成
- `apps/main` - メインアプリ（Next.js 16 / React 19）
- `apps/admin` - 管理画面（Next.js 16 / React 19）
- `packages/shared` - 共有ライブラリ（型定義、Supabaseクライアント、定数）
- `docs/` - 設計ドキュメント一式（8ファイル）

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
| テーブル | 説明 | 主なカラム |
|---|---|---|
| `facilities` | 施設 | name, is_active, plan |
| `profiles` | ユーザー | facility_id, display_name, role(admin/staff) |
| `children` | 児童 | facility_id, name, birth_date, domain_tags[] |
| `daily_records` | 日次記録 | child_id, date, activities[], ai_text, mood |
| `attendances` | 出席 | child_id, date, is_present |
| `phrase_bank` | フレーズ | category, text, domain_tags[] |

※ RLS（Row Level Security）で施設単位のデータ分離

## デプロイ
- メインアプリ: `day-service-app.vercel.app`
- Vercelプロジェクト設定: `.vercel/project.json` にリンク済み
- ルートディレクトリから `npx vercel --prod --yes` で実行

## ドキュメント更新対象（自動実行フローのステップ3で使用）
- `docs/01_要件定義書.md` - 機能要件に変更がある場合
- `docs/02_画面設計書.md` - UI変更がある場合
- `docs/03_DB設計書.md` - DB変更がある場合
- `docs/04_技術設計書.md` - アーキテクチャ変更がある場合
- `docs/05_テスト仕様書.md` - テストケース追加・変更が必要な場合
- `docs/06_API設計書.md` - API変更がある場合
- `docs/07_セキュリティ設計書.md` - セキュリティに影響する場合
- `docs/08_インフラ構成書.md` - インフラ変更がある場合

## 注意事項
- `apps/main` 単体からの `vercel` デプロイは失敗する（モノレポのためルートから実行）
- daily_records は (child_id, date) でユニーク制約あり
- phrase_bank の facility_id が NULL のレコードはデフォルトフレーズ（全施設共通）
