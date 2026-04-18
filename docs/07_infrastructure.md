# インフラ・デプロイ・環境構築手順書

> プロジェクト: **ぱっと記録（Patto Kiroku）**  |  docs-template v1.0 準拠

---

## 1. 環境一覧

プロジェクトで使用する全環境を以下に定義する。

| 環境名 | URL | 用途 | デプロイ方法 |
|--------|-----|------|------------|
| 本番（メインアプリ） | https://day-service-app.vercel.app | エンドユーザー向け | `main` ブランチへのpushで自動デプロイ |
| 本番（管理画面） | https://day-service-admin.vercel.app | スーパー管理者向け | `main` ブランチへのpushで自動デプロイ |
| プレビュー | 自動生成URL | PRレビュー | PR作成時に自動デプロイ |
| ローカル開発（メイン） | http://localhost:3000 | 開発・デバッグ | `npm run dev:main` |
| ローカル開発（管理画面） | http://localhost:3001 | 開発・デバッグ | `npm run dev:admin` |

---

## 2. 前提条件

### 2.1 必要なツール

開発環境に必要なツール一覧。

| ツール | バージョン | インストール方法 |
|--------|-----------|----------------|
| Node.js | 20.x LTS以上 | https://nodejs.org/ または `nvm install 20` |
| npm | 10.x以上 | Node.jsに付属（workspaces機能を使用するため10.x必須） |
| Git | 最新 | https://git-scm.com/ |
| Vercel CLI | 最新 | `npm install -g vercel` |

### 2.2 必要なアカウント

開発に必要なアカウント一覧。

| サービス | プラン | 用途 | URL | 備考 |
|---------|--------|------|-----|------|
| GitHub | Free | ソースコード管理 | https://github.com | リポジトリへの招待が必要 |
| Supabase | Free / Pro | データベース・認証 | https://supabase.com | プロジェクトへのアクセス権が必要 |
| Vercel | Hobby / Pro | ホスティング・デプロイ | https://vercel.com | チームへの招待が必要 |
| Anthropic | 有料 | Claude API（AI記録生成） | https://console.anthropic.com | APIキーの発行が必要 |

---

## 3. ローカル開発環境構築

### 3.1 リポジトリクローン

```bash
git clone https://github.com/{owner}/day-service-app.git
cd day-service-app
```

### 3.2 モノレポ構造

本プロジェクトはnpm workspacesによるモノレポ構成を採用している。

```
day-service-app/
├── apps/
│   ├── main/          # メインアプリ（Next.js 16）
│   └── admin/         # 管理画面（Next.js 16）
├── packages/
│   └── shared/        # 共有ライブラリ（型定義、Supabaseクライアント、定数）
├── supabase/
│   └── migrations/    # DBマイグレーション
├── docs/              # 設計ドキュメント
├── package.json       # ルート（workspaces定義）
└── .env.local         # 環境変数（gitignore対象）
```

ルート `package.json` の workspaces 定義により、`npm install` をルートで実行するだけで全パッケージの依存関係がインストールされる。

ワークスペース別パッケージ名は以下のとおり。

| パッケージ | npm name | ポート |
|---|---|---|
| メインアプリ | `@patto/main` | 3000 |
| 管理画面 | `@patto/admin` | 3001 |
| 共有ライブラリ | `@patto/shared` | -- |

### 3.3 依存関係インストール

```bash
npm install
```

ルートから実行すると、workspaces内の全パッケージ（`apps/main`、`apps/admin`、`packages/shared`）の依存関係が一括インストールされる。

### 3.4 環境変数設定

環境変数の設定。`.env.example` をコピーして `.env.local` を作成する。

```bash
cp .env.example .env.local
```

以下の環境変数を `.env.local` に設定する。**注意:** `.env.local` は各アプリのディレクトリではなく、プロジェクトルートに配置する。

| 変数名 | 必須 | 説明 | 取得場所 | スコープ |
|--------|------|------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | SupabaseプロジェクトのURL | Supabaseダッシュボード → Settings → API | クライアント + サーバー |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabaseの匿名キー | 同上 | クライアント + サーバー |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabaseのサービスロールキー（RLSバイパス） | 同上 | サーバーのみ（Admin用） |
| `ANTHROPIC_API_KEY` | Yes | Claude API キー（AI記録生成用） | https://console.anthropic.com/api-keys | サーバーのみ（メインアプリ用） |
| `ADMIN_PASSWORD` | Yes | 管理画面ログインパスワード | 自分で設定 | サーバーのみ（Admin用） |

`NEXT_PUBLIC_` プレフィックスが付いた変数はクライアントサイドに公開される。秘密鍵には絶対に `NEXT_PUBLIC_` を付けないこと。

`.env.local` のテンプレート:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
ADMIN_PASSWORD=your-admin-password-here
```

### 3.5 外部サービスセットアップ

#### Supabase（データベース）

1. [Supabaseダッシュボード](https://supabase.com/dashboard)にログイン
2. "New Project" をクリック
3. 設定:
   - **Name:** patto-kiroku（任意）
   - **Database Password:** 強力なパスワードを設定
   - **Region:** Northeast Asia（ap-northeast-1）
   - **Pricing Plan:** Free（開始時）
4. SQL Editorで初期マイグレーションを番号順に実行:

| 順序 | ファイル | 内容 |
|---|---|---|
| 1 | `001_initial_schema.sql` | テーブル定義、RLSポリシー、トリガー |
| 2 | `002_seed_phrases.sql` | デフォルトフレーズ（20件）のINSERT |
| 3 | `003_settings_phase2.sql` | 施設更新・スタッフ管理用RLS追加 |
| 4 | `004_signup_policies.sql` | サインアップ用INSERTポリシー |
| 5 | `005_daily_records_unique.sql` | `daily_records` のユニーク制約追加 |
| 6 | `006_admin_features.sql` | `super_admin`、施設拡張カラム、管理用RLS |
| 7 | `007_ai_text_column.sql` | `daily_records` に `ai_text` カラム追加 |

**重要:** マイグレーションは必ず番号順に実行すること。

5. Authentication → Settings で以下を設定:
   - **Email Auth:** 有効化（デフォルト）
   - **Email Confirmations:** 無効化（開発時。本番では要検討）
   - **Minimum Password Length:** 6文字

#### Anthropic API

1. [Anthropic Console](https://console.anthropic.com/) にログイン
2. API Keys → Create Key
3. キーを環境変数 `ANTHROPIC_API_KEY` として保存

### 3.6 Next.js 設定

各アプリの `next.config.ts` では `@patto/shared` パッケージをトランスパイル対象に指定する必要がある。

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@patto/shared"],
};

export default nextConfig;
```

`@patto/shared` はビルド済みパッケージではないため、`transpilePackages` の指定が必須。

### 3.7 開発サーバー起動

```bash
# メインアプリ（port 3000）
npm run dev:main

# 管理画面（port 3001）— 別ターミナル
npm run dev:admin
```

### 3.8 動作確認チェックリスト

セットアップ完了の確認項目。

- [ ] `npm run dev:main` でエラーなく起動する
- [ ] http://localhost:3000 にアクセスしてログイン画面が表示される
- [ ] 新規登録（メール、パスワード、表示名、施設名）が完了する
- [ ] ホーム画面に遷移し、児童一覧が表示される
- [ ] `npm run dev:admin` でエラーなく起動する
- [ ] http://localhost:3001 にアクセスして管理画面ログイン画面が表示される
- [ ] `ADMIN_PASSWORD` でログインできる
- [ ] `npm run build:main` でビルドが成功する
- [ ] `npm run build:admin` でビルドが成功する
- [ ] `npm run lint:main` でエラーがない
- [ ] `npm run lint:admin` でエラーがない

---

## 4. ビルド

### 4.1 ビルドコマンド

```bash
# メインアプリ プロダクションビルド
npm run build:main

# 管理画面 プロダクションビルド
npm run build:admin
```

ビルド成果物は各アプリの `.next/` ディレクトリに出力される。

### 4.2 Lint・型チェック

コード品質チェックのコマンド。

```bash
# メインアプリ ESLint
npm run lint:main

# 管理画面 ESLint
npm run lint:admin

# TypeScript型チェック（各アプリディレクトリで実行）
npx tsc --noEmit
```

---

## 5. デプロイ

### 5.1 デプロイ先

デプロイ先の構成。本プロジェクトはモノレポのため、2つのVercelプロジェクトを運用する。

| 環境 | プラットフォーム | プロジェクト名 | ルートディレクトリ | URL |
|------|---------------|--------------|-----------------|-----|
| 本番（メインアプリ） | Vercel | day-service-app | `apps/main` | https://day-service-app.vercel.app |
| 本番（管理画面） | Vercel | day-service-admin | `apps/admin` | https://day-service-admin.vercel.app |

### 5.2 デプロイ手順

**自動デプロイ（推奨）:**

```
main ブランチへの push / merge
  → Vercel が自動検知
  → ビルド実行（installCommand: "cd ../.. && npm install"）
  → デプロイ完了
```

**手動デプロイ（緊急時）:**

```bash
# ルートディレクトリから実行（必須）
npx vercel --prod --yes
```

**重要:** `apps/main` 単体からの `vercel` コマンドは失敗する。必ずルートディレクトリから実行すること。

**ロールバック手順:**
1. Vercelダッシュボード → Deployments
2. 直前の正常なデプロイを選択
3. 「Redeploy」をクリック

### 5.3 Vercel プロジェクト設定

各アプリの `vercel.json` でモノレポ対応の `installCommand` を指定する。

```json
{
  "installCommand": "cd ../.. && npm install",
  "framework": "nextjs"
}
```

### 5.4 Vercel 環境変数設定

各プロジェクトのSettings → Environment Variablesに以下を設定する。

**メインアプリ:**

| 変数 | スコープ |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview |
| `ANTHROPIC_API_KEY` | Production, Preview |

**管理画面:**

| 変数 | スコープ |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview |
| `ADMIN_PASSWORD` | Production, Preview |

### 5.5 CI/CDパイプライン

Vercelによる自動CI/CDパイプライン。

```
push / PR作成
  → Vercel ビルドパイプライン
    ├── 依存関係インストール (npm install)
    ├── TypeScript型チェック
    ├── ESLint チェック
    ├── Next.js ビルド (next build)
    └── デプロイ
        ├── main ブランチ → 本番環境
        └── その他ブランチ → プレビュー環境
```

### 5.6 GitHub連携

1. Vercelダッシュボード → Project → Settings → Git
2. GitHubリポジトリを接続
3. Root Directoryに `apps/main` または `apps/admin` を設定
4. `main` ブランチへのpushで自動デプロイ

### 5.7 デプロイ後の動作確認

**メインアプリ:**

| 確認項目 | URL / 操作 | 期待結果 |
|---|---|---|
| ログイン画面表示 | `/login` | ログインフォーム表示 |
| 新規登録 | 新規登録タブ → 各項目入力 → 送信 | ホーム画面に遷移 |
| データ取得 | ホーム画面 | 児童一覧が表示される |
| AI記録生成 | 記録入力 → AI生成ボタン | テキストが生成される |

**管理画面:**

| 確認項目 | URL / 操作 | 期待結果 |
|---|---|---|
| ログイン画面表示 | `/login` | パスワード入力フォーム表示 |
| ログイン | `ADMIN_PASSWORD` を入力 → 送信 | ダッシュボードに遷移 |
| 統計表示 | ダッシュボード | 5つの統計カードに数値が表示 |
| 施設一覧 | サイドバー → 施設管理 | 施設一覧が表示される |

---

## 6. 外部サービス構成

### 6.1 Supabase

| 項目 | 値 |
|------|---|
| ダッシュボード | https://app.supabase.com/project/{project-id} |
| リージョン | Northeast Asia (Tokyo) |
| プラン | Free / Pro |
| データベース | PostgreSQL 15 |
| 認証 | Supabase Auth（GoTrue）、メール・パスワード認証 |
| API | PostgREST（自動生成REST API） |
| RLS | 全テーブルで有効化 |
| DB容量上限 | 500MB（Freeプラン） |

### 6.2 Vercel

| 項目 | 値 |
|------|---|
| ダッシュボード | https://vercel.com/{team}/{project} |
| フレームワーク | Next.js 16 |
| プラン | Hobby / Pro |
| SSL/TLS | 自動（Let's Encrypt） |
| CDN | Vercel Edge Network（グローバル） |
| 帯域上限 | 100GB/月（Hobbyプラン） |

### 6.3 Anthropic

| 項目 | 値 |
|------|---|
| ダッシュボード | https://console.anthropic.com |
| 用途 | Claude APIによるAI支援記録生成 |
| 使用モデル | `claude-opus-4-7` |
| プラン | 従量課金 |

---

## 7. 依存関係管理

主要な依存パッケージを以下に記録する。

**メインアプリ (`apps/main`):**

| パッケージ | 用途 | バージョン |
|-----------|------|-----------|
| `next` | フレームワーク | 16.1.6 |
| `react` / `react-dom` | UIライブラリ | 19.2.3 |
| `@supabase/ssr` | Supabase SSRクライアント | ^0.8.0 |
| `@supabase/supabase-js` | Supabaseクライアント | ^2.96.0 |
| `@anthropic-ai/sdk` | Claude API | ^0.78.0 |
| `tailwindcss` | CSSフレームワーク | ^4 |
| `typescript` | 型チェック | ^5 |

**管理画面 (`apps/admin`):**

| パッケージ | 用途 | バージョン |
|-----------|------|-----------|
| `next` | フレームワーク | 16.1.6 |
| `react` / `react-dom` | UIライブラリ | 19.2.3 |
| `@supabase/ssr` | Supabase SSRクライアント | ^0.8.0 |
| `@supabase/supabase-js` | Supabaseクライアント | ^2.96.0 |
| `tailwindcss` | CSSフレームワーク | ^4 |
| `typescript` | 型チェック | ^5 |

管理画面は `@anthropic-ai/sdk` を使用しない（AI機能はメインアプリのみ）。

**共有ライブラリ (`packages/shared`):**

`@patto/shared` はビルド済みパッケージではなく、TypeScriptソースを直接参照する。インポートパスの例:

```typescript
import { Child, DailyRecord } from "@patto/shared";
import { createClient } from "@patto/shared/supabase/client";
import { DOMAIN_TAGS } from "@patto/shared/constants";
```

```bash
# 脆弱性チェック
npm audit

# 依存関係の更新確認
npm outdated
```

---

## 8. コスト見積もり

月額コストの見積もり。

| サービス | プラン | 月額上限 | 主な制限 | アラート設定 |
|---------|--------|---------|---------|------------|
| Vercel | Hobby | $0 | 帯域100GB/月、ビルド6,000分/月 | なし（無料枠） |
| Supabase | Free | $0 | DB 500MB、MAU 50,000 | なし（無料枠） |
| Anthropic | 従量課金 | 使用量に依存 | -- | 要設定（コンソールで上限設定推奨） |
| ドメイン | -- | $0 | Vercel提供サブドメイン使用 | -- |

**合計月額**: $0 + AI API使用量（全サービス無料プラン使用時）

**スケールアップパス:**

| フェーズ | ユーザー規模 | 推奨プラン |
|---|---|---|
| PoC・テスト | ~5施設 | Vercel Hobby + Supabase Free |
| 初期運用 | ~20施設 | Vercel Pro + Supabase Pro |
| 本格運用 | 20施設~ | Vercel Pro + Supabase Pro（スケールアップ） |

---

## 9. ログ戦略

### 9.1 ログレベル

アプリケーションのログレベル定義。

| レベル | 用途 | 出力先 | 例 |
|--------|------|--------|---|
| `error` | 復旧が必要なエラー | コンソール + Vercel Logs | DB接続失敗、認証サービスダウン、AI APIエラー |
| `warn` | 動作継続可能だが注意が必要 | コンソール | API応答遅延、非推奨機能の使用 |
| `info` | 重要な業務イベント | コンソール | ユーザー登録完了、AI記録生成成功 |
| `debug` | 開発時のデバッグ情報 | コンソール（開発環境のみ） | APIリクエスト/レスポンス詳細 |

### 9.2 機密データ除外ルール

以下のデータは絶対にログに出力しない。

- パスワード（平文・ハッシュ値ともに不可）
- 認証トークン（JWT、APIキー）
- 児童の個人情報（氏名、生年月日）
- メールアドレス
- 環境変数の秘密値（`SERVICE_ROLE_KEY`、`ANTHROPIC_API_KEY`、`ADMIN_PASSWORD`）

→ 関連: 08_security.md

---

## 10. 監視・トラブルシューティング

### 10.1 ヘルスチェック

アプリの正常稼働を確認する方法。

| チェック項目 | 方法 | 正常時の応答 |
|------------|------|------------|
| メインアプリ疎通 | `curl https://day-service-app.vercel.app` | HTTP 200 |
| 管理画面疎通 | `curl https://day-service-admin.vercel.app` | HTTP 200（→ /login へリダイレクト） |
| Supabase疎通 | Supabase Dashboard → Health | 正常 |

### 10.2 ログ確認場所

各環境のログを確認する方法。

| 環境 | ログ確認方法 | 保持期間 |
|------|------------|---------|
| ローカル | ターミナルのコンソール出力 | -- |
| 本番（アプリ） | Vercel → Functions → Logs | 1時間（Free）/ 3日（Pro） |
| 本番（API） | Supabase → Logs → API | 7日 |
| 本番（認証） | Supabase → Logs → Auth | 7日 |
| 本番（DB） | Supabase → Logs → Postgres | 7日 |

### 10.3 よくある問題と対処法

開発中・運用中に遭遇しやすい問題とその解決策を以下に記載する。

| 問題 | 原因 | 対処法 |
|------|------|--------|
| `Module not found: @patto/shared` | `next.config.ts` の `transpilePackages` 未設定 | `transpilePackages: ["@patto/shared"]` を追加 |
| Vercelデプロイ失敗 | `apps/main` から直接デプロイ | ルートから `npx vercel --prod --yes` を実行 |
| RLSでデータ取得不可 | `profiles` レコード未作成 | サインアップフローでプロフィール作成を確認 |
| AI生成エラー | `ANTHROPIC_API_KEY` 未設定 | 環境変数を確認 |
| 管理画面ログイン不可 | `ADMIN_PASSWORD` 未設定 | Vercel環境変数を確認 |
| `npm install` 失敗 | workspaces解決エラー | `node_modules` 削除後に `npm install` 再実行 |
| Supabaseに接続できない | 環境変数が未設定または期限切れ | `.env.local` の `SUPABASE_URL` と `ANON_KEY` を確認 |
| ビルドエラー: 型エラー | TypeScriptの型不整合 | `npx tsc --noEmit` で詳細を確認し修正 |

---

## 11. バックアップ・災害復旧

### 11.1 バックアップ方針

| 対象 | 方式 | 頻度 | 保持期間 |
|------|------|------|---------|
| データベース（Freeプラン） | 手動エクスポート（`pg_dump`） | 任意 | 手動管理 |
| データベース（Proプラン） | Supabase自動バックアップ | 日次 | 7日間 |
| ソースコード | Git（GitHub） | push毎 | 無期限 |
| 環境変数 | `.env.example` にテンプレート保持 | 変更時 | Git管理 |

### 11.2 復旧手順

1. **ソースコードの復旧**: GitHubからクローン
2. **データベースの復旧**: Supabaseダッシュボード → Backups → 最新のバックアップを復元（Proプラン）、またはSQL Editorでマイグレーションを再実行（Freeプラン）
3. **環境変数の再設定**: `.env.example` をコピーし、各サービスのダッシュボードから値を取得
4. **動作確認**: 3.8のチェックリストで正常動作を確認

---

## 12. 管理タスク

定期的または必要に応じて実行する管理タスクを以下に定義する。

| タスク | コマンド / 手順 | 実行タイミング | 注意事項 |
|--------|---------------|--------------|---------|
| DBマイグレーション | Supabase SQL Editorで実行 | スキーマ変更時 | 番号順に実行すること |
| 依存関係の脆弱性チェック | `npm audit` | 週1回 | criticalは24時間以内に対応 |
| 依存関係の更新確認 | `npm outdated` | 月1回 | メジャーバージョンアップは影響確認後 |
| スーパー管理者設定 | SQL Editorで `is_super_admin = true` に更新 | 初回セットアップ時 | -- |
| デフォルトフレーズ確認 | SQL Editor: `SELECT count(*) FROM phrase_bank WHERE is_default = true` | セットアップ後 | 20件あれば正常 |

---

## 13. 初期データ投入

### 13.1 最初の管理者アカウント作成

1. メインアプリ（localhost:3000）にアクセス
2. 「新規登録」タブを選択
3. メール、パスワード、表示名、施設名を入力して登録
4. 自動的に `admin` ロールのユーザーが作成される

### 13.2 スーパー管理者の設定

Supabaseダッシュボード → SQL Editor:

```sql
UPDATE profiles SET is_super_admin = true WHERE display_name = '管理者名';
```

### 13.3 初期セットアップの推奨手順

```
1. メインアプリで最初の管理者アカウントを新規登録
2. Supabase SQL Editorで is_super_admin = true を設定
3. 管理画面にログインしてダッシュボードの統計を確認
4. 必要に応じて管理画面から施設を追加作成
5. メインアプリのスタッフ招待リンクでスタッフを追加
```

→ 関連: 09_business_logic.md §2（認証・ユーザー管理）

---

## チェックリスト

- [x] 環境変数が全て §3.4 に記載されている
- [x] クローンから起動まで §3.1〜3.8 の手順通りに実行可能である
- [x] モノレポ構造（npm workspaces）が説明されている
- [x] 2つのVercelプロジェクトのデプロイ手順が記載されている
- [x] ロールバック手順が記載されている
- [x] 全外部サービスのダッシュボードURLが記載されている
- [x] コスト見積もりとスケールアップパスが記載されている
- [x] ログレベルと機密データ除外ルールが定義されている
- [x] よくある問題と対処法が記載されている
- [x] バックアップ方針と復旧手順が定義されている
- [x] 管理タスクのコマンドがコピー&ペーストで実行可能である
- [x] 初期データ投入手順が記載されている
- [x] テーブルの前に導入文がある
- [x] 技術用語にバッククォートが使われている

---

## 改善提案

| # | 提案 | 優先度 | 理由 |
|---|------|--------|------|
| 1 | GitHub Actionsによる CI パイプラインの構築 | 中 | 現在はVercelのビルド時チェックのみ。独立したCI（テスト実行含む）があるとPRレビューの品質が向上する |
| 2 | `.env.example` ファイルの作成・リポジトリ管理 | 高 | 新メンバーのオンボーディング時間を短縮できる |
| 3 | Supabase CLIの導入によるマイグレーション管理 | 中 | 現在はSQL Editorで手動実行。`supabase db push` で自動化するとミス防止になる |
| 4 | Dependabotの導入 | 低 | 依存関係の脆弱性を自動検出し、PRを自動作成できる |
| 5 | ステージング環境の構築 | 中 | 現在はプレビュー環境のみ。本番と同一構成のステージング環境があるとリリース前検証が安全になる |
