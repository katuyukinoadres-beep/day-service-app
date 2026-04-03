# アーキテクチャ設計書

> プロジェクト: **ぱっと記録（Patto Kiroku）**  |  docs-template v1.0 準拠

---

## 1. 技術スタック

プロジェクトで使用する技術とその選定理由を示す。

| カテゴリ | 技術 | バージョン | 選定理由 |
|---------|------|-----------|---------|
| フレームワーク | Next.js | 16.1.6 | App Router + SSR/SSG対応。React最新機能が利用可能。Vercelとの親和性が高い |
| UIライブラリ | React | 19.2.3 | コンポーネントベースUI。Server Componentsサポート |
| 言語 | TypeScript | 5.x | 型安全による開発効率とバグ防止。strict mode使用 |
| スタイリング | Tailwind CSS | 4.x | ユーティリティファーストで高速なUI構築。`@theme` によるカスタムテーマ対応 |
| BaaS / DB | Supabase (PostgreSQL) | - | Auth・DB・RLS一体型BaaS。マルチテナントRLSを実現 |
| Supabase SDK | `@supabase/supabase-js` | 2.96.0 | Supabaseクライアント。型安全なDB操作 |
| SSR認証 | `@supabase/ssr` | 0.8.0 | Next.js App Router対応のCookieベースセッション管理 |
| AI生成 | `@anthropic-ai/sdk` | - | Claude Sonnet 4.5 APIによる支援記録文章の自動生成 |
| リンター | ESLint | 9.x | コード品質チェック |
| ホスティング | Vercel | - | Next.jsとの親和性、自動プレビューデプロイ。2プロジェクト構成 |
| パッケージ管理 | npm workspaces | - | モノレポ内の依存関係管理 |

---

## 2. システム全体構成

### 2.1 システムコンテキスト図

外部アクターとシステム境界の関係を示す。

```
[スタッフ/管理者] --HTTPS--> [メインアプリ (Vercel / apps/main)]
                                       |
                                  REST API / SDK
                                       |
                                  [Supabase]
                                  /    |     \
                          [PostgreSQL] [Auth] [RLS]

[スーパー管理者] --HTTPS--> [Admin管理画面 (Vercel / apps/admin)]
                                       |
                              service_role key
                              (RLSバイパス)
                                       |
                                  [Supabase]

[メインアプリ] --HTTPS--> [Anthropic API (Claude Sonnet 4.5)]
                           AI支援記録まとめ生成
```

### 2.2 構成図

```
┌─────────────────────────────────────────┐
│  Client (Browser)                       │
│  スマートフォン / タブレット / PC         │
│  https://day-service-app.vercel.app     │
└──────────┬──────────────────────────────┘
           │ HTTPS
┌──────────▼──────────────────────────────┐
│  Vercel (Next.js App Router)            │
│  ├─ apps/main    メインアプリ            │
│  │  ├─ Middleware (認証セッション管理)    │
│  │  └─ API Route /api/generate-record   │
│  └─ apps/admin   Admin管理画面           │
│     ├─ API Route /api/admin-data        │
│     └─ API Route /api/login             │
└──────┬───────────────────┬──────────────┘
       │ HTTPS (SDK)       │ HTTPS (REST)
┌──────▼──────────┐  ┌────▼──────────────┐
│  Supabase       │  │  Anthropic API    │
│  ├─ Auth (JWT)  │  │  Claude Sonnet 4.5│
│  ├─ PostgreSQL  │  │  支援記録生成      │
│  └─ RLS         │  └───────────────────┘
└─────────────────┘
```

### 2.3 リポジトリ構成

モノレポ（npm workspaces）で構成されたディレクトリ構造を示す。

```
day-service-app/
├── apps/
│   ├── main/                      # メインアプリ（スタッフ向け）
│   │   └── src/
│   │       ├── app/
│   │       │   ├── layout.tsx     # ルートレイアウト
│   │       │   ├── globals.css    # Tailwind CSS 4 テーマ定義
│   │       │   ├── login/         # ログイン画面
│   │       │   ├── join/          # スタッフ招待受付画面
│   │       │   ├── api/generate-record/  # AI文章生成API Route
│   │       │   ├── record/[childId]/     # 記録入力画面（BottomNavなし）
│   │       │   └── (main)/        # メインルートグループ（BottomNav付き）
│   │       │       ├── page.tsx   # ホーム（本日の記録ダッシュボード）
│   │       │       ├── children/  # 児童管理
│   │       │       ├── documents/ # 帳票出力
│   │       │       ├── history/   # 記録履歴
│   │       │       └── settings/  # 設定
│   │       ├── components/        # 機能コンポーネント
│   │       │   └── ui/            # 汎用UIパーツ
│   │       ├── lib/               # ユーティリティ・フック・クライアント
│   │       └── middleware.ts      # 認証ミドルウェア
│   │
│   └── admin/                     # Admin管理画面（スーパー管理者向け）
│       └── src/
│           ├── app/
│           │   ├── login/         # Adminログイン
│           │   ├── api/admin-data/ # service_role keyでRLSバイパス
│           │   ├── api/login/     # パスワード認証
│           │   └── (dashboard)/   # 管理ダッシュボード
│           │       ├── page.tsx   # 統計ダッシュボード
│           │       ├── facilities/ # 施設管理
│           │       ├── users/     # ユーザー管理
│           │       └── reports/   # レポート
│           ├── components/
│           └── lib/
│
├── packages/
│   └── shared/                    # 共通パッケージ
│       └── src/
│           ├── types/database.ts  # DB型定義（Supabase生成型）
│           ├── supabase/          # Supabaseクライアント共通設定
│           ├── constants.ts       # 共通定数
│           └── index.ts           # エクスポート
│
├── supabase/migrations/           # DBマイグレーション（7ファイル）
├── docs/                          # 設計ドキュメント
└── package.json                   # モノレポルート（npm workspaces）
```

### 2.4 命名規約

プロジェクト全体で統一する命名ルールを示す。

| 対象 | 規約 | 例 |
|------|------|---|
| ページ | `page.tsx`（Next.js App Router規約） | `app/(main)/children/page.tsx` |
| レイアウト | `layout.tsx`（Next.js App Router規約） | `app/(main)/layout.tsx` |
| 汎用コンポーネント | PascalCase `.tsx` | `Button.tsx`, `Card.tsx` |
| 機能コンポーネント | PascalCase `.tsx` | `BottomNav.tsx`, `RecordForm.tsx` |
| カスタムフック | camelCase、`use` プレフィックス | `useProfile.ts` |
| ユーティリティ | camelCase `.ts` | `constants.ts`, `database.ts` |
| 型定義 | camelCase `.ts` | `database.ts` |
| 定数 | `UPPER_SNAKE_CASE` | 定数ファイル内で使用 |
| CSSクラス | Tailwind ユーティリティ（ケバブケース） | `bg-primary`, `text-sm` |
| テーブル名 | snake_case（複数形） | `daily_records`, `phrase_bank` |
| カラム名 | snake_case | `facility_id`, `is_active` |

---

## 3. フロントエンドアーキテクチャ

### 3.1 フレームワーク構成

Next.js 16 の App Router を採用し、Vercelにデプロイする。現時点ではすべてのページを `"use client"` ディレクティブを使用したクライアントコンポーネントとして実装している。データの取得は `useEffect` 内で Supabase SDK を直接呼び出す方式を採用している。

モノレポ構成により、メインアプリ（`apps/main`）とAdmin管理画面（`apps/admin`）を独立したNext.jsアプリケーションとしてビルド・デプロイする。共通の型定義やSupabaseクライアント設定は `packages/shared` で管理する。

### 3.2 ルーティング設計

アプリケーションの全ルートを定義する。

**メインアプリ（`apps/main`）:**

| パス | 画面名 | 認証 | 説明 |
|------|--------|------|------|
| `/login` | ログイン | 不要 | メール/パスワード認証 |
| `/join` | スタッフ招待受付 | 不要 | 招待リンクからの登録 |
| `/` | ホーム | 必要 | 本日の記録ダッシュボード |
| `/children` | 児童一覧 | 必要 | 施設の児童管理 |
| `/children/new` | 児童新規登録 | 必要 | 児童情報入力フォーム |
| `/children/[id]` | 児童詳細・編集 | 必要 | 児童情報の閲覧・編集 |
| `/record/[childId]` | 記録入力 | 必要 | 日次記録入力フォーム（BottomNavなし） |
| `/documents` | 帳票出力 | 必要 | 業務日誌・サービス提供記録・月間出席サマリー |
| `/history` | 記録履歴 | 必要 | 過去記録の閲覧 |
| `/settings` | 設定 | 必要 | プロフィール・施設設定・スタッフ管理 |

**Admin管理画面（`apps/admin`）:**

| パス | 画面名 | 認証 | 説明 |
|------|--------|------|------|
| `/login` | Adminログイン | 不要 | パスワード認証 |
| `/` | ダッシュボード | 必要 | 全施設統計 |
| `/facilities` | 施設一覧 | 必要 | 施設管理 |
| `/facilities/[id]` | 施設詳細 | 必要 | 施設情報・スタッフ・記録 |
| `/users` | ユーザー一覧 | 必要 | 全ユーザー管理 |
| `/reports` | レポート | 必要 | 統計レポート |

### 3.3 状態管理

アプリケーションの状態管理戦略を示す。

| 状態カテゴリ | 管理手法 | 保存先 | 選定理由 |
|-------------|---------|--------|---------|
| UI状態 | `useState` | メモリ | コンポーネントローカルで十分。モーダル開閉、フォーム入力等 |
| サーバーデータ | Supabase SDK直接フェッチ | PostgreSQL | グローバル状態管理ライブラリ不使用。`useEffect` + `setState` パターン |
| 認証セッション | `@supabase/ssr` | Cookie | Cookieベースセッション。ミドルウェアでリクエストごとにリフレッシュ |
| プロフィール情報 | `useProfile` カスタムフック | メモリ | マウント時に `profiles` テーブルから取得。`role` による権限判定に使用 |

### 3.4 コンポーネント設計方針

コンポーネントは2層に分類する:

1. **Pages層（`app/` ディレクトリ）**: Next.js App Router規約に従ったページコンポーネント。データ取得とレイアウト構成を担当
2. **Components層**: 機能コンポーネント（`components/`）と汎用UIパーツ（`components/ui/`）

Propsの受け渡しはProps Drillingを基本とし、グローバル状態管理ライブラリは使用しない。認証状態のみ `useProfile` フックで共通化している。

---

## 4. バックエンドアーキテクチャ

### 4.1 API構成

バックエンド専用サーバーは持たず、Supabaseの REST API を Supabase SDK 経由で直接フロントエンドから呼び出す。AI文章生成やAdmin管理画面のデータ取得など、サーバーサイドで処理が必要な機能はNext.jsのAPI Routes（Route Handlers）で実装する。

主要なAPI Routeを示す。

| パス | アプリ | 用途 | 備考 |
|------|--------|------|------|
| `/api/generate-record` | main | AI支援記録まとめ生成 | `ANTHROPIC_API_KEY` を使用。Claude Sonnet 4.5 |
| `/api/admin-data` | admin | 全施設データ取得 | `SUPABASE_SERVICE_ROLE_KEY` でRLSバイパス |
| `/api/login` | admin | Adminパスワード認証 | `ADMIN_PASSWORD` と照合 |

### 4.2 データアクセスパターン

データの読み書きパターンを整理する。

| 操作 | 方法 | 備考 |
|------|------|------|
| 読み取り | `supabase.from('table').select()` | RLSで `facility_id` による自動フィルタ |
| 書き込み | `supabase.from('table').insert()` / `.update()` | `auth.getUser()` → `profiles` → `facility_id` 取得後に実行 |
| 並列取得 | `Promise.all([query1, query2, ...])` | 複数テーブルの同時フェッチで画面表示を高速化 |
| 管理者取得 | `createClient(url, serviceRoleKey)` | Admin管理画面のみ。RLSバイパスで全施設データにアクセス |

→ 関連: 03_database.md &sect;4（RLS）

---

## 5. 認証アーキテクチャ

### 5.1 認証方式

認証方式の基本設定を示す。

| 項目 | 値 |
|------|---|
| 認証プロバイダ | Supabase Auth |
| 認証方式 | メール + パスワード |
| トークン形式 | JWT |
| トークン保存先 | httpOnly Cookie（`@supabase/ssr` 管理） |
| セッション管理 | ミドルウェアでリクエストごとに `updateSession()` を実行 |

### 5.2 認証フロー

```
ログインフロー:

ユーザー          フロントエンド          middleware.ts        Supabase Auth
  |                    |                      |                    |
  |-- メール/PW入力 -->|                      |                    |
  |                    |-- signInWithPassword ---------------------->|
  |                    |                      |                    |-- 認証検証
  |                    |<--------------------- JWT + refresh -------|
  |                    |-- Cookie保存          |                    |
  |<-- / (ホーム) -----|                      |                    |

リクエスト時セッション確認:

ブラウザ             middleware.ts          Supabase Auth
  |                      |                      |
  |-- リクエスト -------->|                      |
  |                      |-- updateSession() -->|
  |                      |                      |-- Cookie内JWTを検証
  |                      |<-- セッション有効 ----|
  |                      |-- リクエスト続行      |
  |                      |                      |
  |                      |  (セッション無効時)   |
  |<-- /login リダイレクト|                      |
```

### 5.3 セッション管理

`@supabase/ssr` を使用したCookieベースのセッション管理を採用している。`middleware.ts` がすべてのリクエスト（静的アセットを除く）で実行され、`updateSession()` によりセッションの有効性確認とトークンリフレッシュを行う。

ブラウザ側では `createBrowserClient()` がCookieからセッション情報を自動取得し、サーバー側では `createServerClient()` が `next/headers` の `cookies()` を使用してセッションにアクセスする。

セッション切れ時は `/login` にリダイレクトし、認証済みユーザーが `/login` にアクセスした場合は `/` にリダイレクトする。

---

## 6. データフロー

### 6.1 主要データフロー

**日次記録入力フロー:**

1. ユーザーがホーム画面で児童を選択し、記録入力画面（`/record/[childId]`）に遷移
2. `useEffect` で `createClient()` を生成し、以下を `Promise.all` で並列取得:
   - 児童情報（`children` テーブル）
   - 既存記録（`daily_records` テーブル、同日分）
   - フレーズバンク（`phrase_bank` テーブル）
3. 既存記録がある場合はフォームに自動復元
4. ユーザーが記録入力（来所・退所時刻、気分、活動、フレーズ選択、メモ）
5. 「AI記録まとめ生成」ボタン押下時:
   - `/api/generate-record` にPOSTリクエスト
   - サーバー側でAnthropic APIを呼び出し、支援記録文章を生成
   - 生成結果をフォームの `ai_text` フィールドに表示
6. 保存ボタン押下で `daily_records` に `upsert`（UNIQUE: `child_id` + `date`）
7. 保存完了後、次の未記録児童の記録画面に自動遷移

### 6.2 キャッシュ戦略

データのキャッシュ方針を示す。

| 対象 | 保存先 | TTL | 無効化条件 |
|------|--------|-----|-----------|
| プロフィール情報 | メモリ（`useProfile` フック） | コンポーネントライフサイクル | アンマウント時 |
| 児童一覧 | メモリ（`useState`） | 画面表示中 | 画面遷移時に再フェッチ |
| フレーズバンク | メモリ（`useState`） | 画面表示中 | 画面遷移時に再フェッチ |

現時点ではキャッシュレイヤーを設けていない。すべてのデータは画面表示時にSupabase SDKから直接フェッチする。

→ 関連: 12. 技術的負債 TD-002

---

## 7. エラーハンドリング方針

### 7.1 エラー分類

アプリケーションで発生するエラーの分類と処理方針を定義する。

| 分類 | 例 | 処理方針 | ユーザー表示 |
|------|---|---------|------------|
| バリデーションエラー | 入力値の未入力・形式不正 | 即時フィードバック | フィールド下に赤文字エラーメッセージ |
| 認証エラー | トークン期限切れ、未認証 | ミドルウェアで `/login` にリダイレクト | ログイン画面への自動遷移 |
| データ取得エラー | Supabase接続失敗 | ローディング状態表示 → 空データでフォールバック | ローディング表示 |
| データ書き込みエラー | DB書き込み失敗 | アラート表示（現状） | `alert()` メッセージ |
| AI生成エラー | Anthropic API接続失敗 | アラート表示 | 「AI生成に失敗しました」メッセージ |
| 権限エラー | RLS拒否 | ログ記録 | 空データ表示（暗黙的拒否） |
| ネットワークエラー | 通信断 | Supabase SDKのリトライ機構に依存 | ブラウザデフォルト |

### 7.2 リトライポリシー

- リトライ対象: Supabase SDKの内蔵リトライ機構に依存
- AI生成: リトライなし（ユーザーが再度ボタン押下で再試行）
- 手動リトライ: 画面のリロードで全データを再フェッチ

### 7.3 ログ出力ルール

- 開発環境: `console.error` / `console.warn` でブラウザコンソールに出力
- 本番環境: Vercel Functions ログに出力（API Routes内のエラー）
- ログに含めてはいけない情報: パスワード、JWTトークン、API Key

---

## 8. パフォーマンス最適化

パフォーマンス最適化の施策と状況を示す。

| 分類 | 施策 | 状況 | 効果・備考 |
|------|------|------|-----------|
| 実装済み | 並列データフェッチ（`Promise.all`） | ✅ | 複数テーブル同時取得による画面表示高速化 |
| 実装済み | クライアントサイドルーティング | ✅ | App Routerによる高速な画面遷移 |
| 実装済み | フォント最適化（`next/font`） | ✅ | Noto Sans JP の最適読み込み |
| 実装済み | CSS最適化（Tailwind CSS パージ） | ✅ | 未使用CSS除去によるバンドルサイズ削減 |
| 実装済み | 印刷最適化（`@page` ルール） | ✅ | A4用紙サイズ対応の帳票出力 |
| 計画中 | Server Components の活用 | 未着手 | 現在すべて Client Components。初回表示の高速化に貢献 |
| 計画中 | SWR / React Query の導入 | 未着手 | データフェッチのキャッシュ・再検証戦略 |
| 計画中 | 画像最適化（`next/image`） | 未着手 | LCP改善 |
| 計画中 | 動的インポート（`React.lazy`） | 未着手 | バンドルサイズの最適化 |

→ 関連: 01_requirements.md &sect;3.1（パフォーマンス非機能要件）

---

## 9. 外部サービス連携

プロジェクトが依存する外部サービスの一覧を示す。

| サービス | 用途 | 認証方式 | 料金プラン | 制限事項 |
|---------|------|---------|-----------|---------|
| Supabase | DB・Auth・RLS | API Key + JWT | Free | DB 500MB, MAU 50,000 |
| Vercel | ホスティング・CDN | GitHub連携 | 2プロジェクト | メインアプリ + Admin管理画面 |
| Anthropic API | AI支援記録まとめ生成 | API Key (Bearer) | 従量課金 | Claude Sonnet 4.5。RPMの制限あり |

---

## 10. 開発パターン

### 10.1 新しい画面を追加する

1. `apps/main/src/app/(main)/{path}/page.tsx` を作成（BottomNav付き画面の場合）
2. `apps/main/src/app/{path}/page.tsx` を作成（BottomNavなし画面の場合）
3. レイアウトが必要なら `layout.tsx` を追加
4. BottomNavのタブ定義に追加（該当する場合）
5. `middleware.ts` の認証制御を確認
6. → `docs/01_requirements.md` に機能要件を追記
7. → `docs/02_architecture.md` のルーティング設計テーブルを更新

### 10.2 新しいDBテーブルを追加する

1. `supabase/migrations/` に新しいマイグレーションファイルを作成（`{NNN}_{description}.sql`）
2. RLSポリシーを設定（`facility_id` ベースの施設分離パターンに従う）
3. `packages/shared/src/types/database.ts` に型定義を追加
4. Supabase Dashboard でマイグレーションを適用
5. → `docs/03_database.md` にテーブル定義・RLSポリシーを追記
6. → `docs/02_architecture.md` のリポジトリ構成を更新（必要に応じて）

### 10.3 AI生成プロンプトを変更する

1. `apps/main/src/app/api/generate-record/route.ts` のプロンプトを編集
2. ローカル開発環境でテスト（`npm run dev:main`）
3. → `docs/01_requirements.md` のREC-007説明を更新（必要に応じて）

---

## 11. 設計判断記録（ADR）

### ADR-001: モノレポ構成（npm workspaces）の採用

- **状況**: メインアプリとAdmin管理画面で型定義やSupabaseクライアント設定を共有する必要があった
- **決定**: npm workspacesによるモノレポ構成を採用し、`apps/main`、`apps/admin`、`packages/shared` の3パッケージに分割
- **理由**: Turborepo等の追加ツールなしで依存関係管理が可能。Vercelのモノレポ対応でRoot Directoryを指定するだけでデプロイ可能
- **影響**: `apps/main` 単体からの `vercel` デプロイは不可（ルートから実行が必要）。共通パッケージの変更は両アプリに影響する

### ADR-002: 全ページをClient Componentsで実装

- **状況**: Next.js App RouterではServer Componentsがデフォルトだが、データ取得をSupabase SDK経由のクライアントサイドフェッチで統一するかの判断が必要だった
- **決定**: すべてのページに `"use client"` を付与し、`useEffect` + `useState` パターンでデータを取得する方式を採用
- **理由**: 認証状態に基づくデータ取得のシンプルさを優先。Supabase RLSによるサーバー側フィルタがあるため、クライアント直接アクセスでもセキュリティは担保される
- **影響**: Server Componentsの初回表示最適化の恩恵を受けられない。将来的にServer Components移行を検討（→ TD-001）

### ADR-003: グローバル状態管理ライブラリ不採用

- **状況**: Redux, Zustand, Jotai等のグローバル状態管理ライブラリを導入するかの検討
- **決定**: 導入しない。Supabase SDKによる直接フェッチ + `useState` で管理
- **理由**: 各画面が独立してデータをフェッチするシンプルな構成であり、画面間でのデータ共有が限定的。状態管理ライブラリを導入するとオーバーエンジニアリングになる
- **影響**: 画面遷移ごとにデータを再フェッチするため、ネットワークリクエスト数が増加する。キャッシュ戦略の導入が将来的な改善候補

### ADR-004: Admin管理画面をservice_role keyでRLSバイパス

- **状況**: Admin管理画面から全施設のデータにアクセスする必要があった
- **決定**: `apps/admin` のAPI RoutesでSupabase `service_role` keyを使用し、RLSをバイパスしてデータ取得
- **理由**: 通常のRLSポリシーは `facility_id` ベースの分離が前提であり、全施設横断のクエリには対応できない。`service_role` keyはサーバーサイド（API Routes）でのみ使用し、クライアントには露出しない
- **影響**: `SUPABASE_SERVICE_ROLE_KEY` の管理が必要。Admin管理画面のセキュリティは別途パスワード認証で担保

---

## 12. 技術的負債・リスク

既知の技術的負債とリスクを一覧化する。

| ID | 内容 | 影響 | 対応予定 |
|----|------|------|---------|
| TD-001 | 全ページがClient Components（Server Components未活用） | 中: 初回表示の最適化が不十分。SEO不要のためクリティカルではない | 段階的にServer Components移行 |
| TD-002 | データフェッチのキャッシュ戦略が未実装 | 中: 画面遷移ごとに再フェッチ。不要なネットワークリクエスト | SWR / React Query導入を検討 |
| TD-003 | エラーハンドリングが `alert()` ベース | 低: UXが悪い。トースト通知への移行が望ましい | UI改善フェーズで対応 |
| TD-004 | Supabase Free プランのDB容量上限（500MB） | 高: 施設数増加時に容量超過リスク | 利用状況監視 + Proプラン移行計画 |
| TD-005 | テストカバレッジが不十分 | 中: リグレッションリスク | テスト仕様書に基づくテスト追加 |
| TD-006 | Admin管理画面のパスワード認証がシンプル | 中: ブルートフォース耐性が低い | レート制限・2FA導入を検討 |

---

## チェックリスト

- [x] 技術スタックに選定理由が記載されている
- [x] 構成図にURL情報が含まれている
- [x] リポジトリ構成が実際のディレクトリと一致している
- [x] 全ルートがルーティング設計テーブルに記載されている
- [x] 状態管理の各カテゴリに選定理由がある
- [x] 認証フローが図示されている
- [x] エラーハンドリング方針が全分類について定義されている
- [x] パフォーマンス最適化の実装済み/計画中が分離されている
- [x] ADRが4件記載されている
- [x] 技術的負債が記録されている
- [x] テーブルの前に導入文がある
- [x] 技術用語にバッククォートが使われている

---

## 改善メモ

- 旧ドキュメント（`04_技術設計書.md`）からの移行に伴い、テンプレート構造（ADR、技術的負債、チェックリスト）を新規追加した
- 技術スタックテーブルに「選定理由」列を追加
- システムコンテキスト図・構成図を追加し、Admin管理画面との関係を明示
- ルーティング設計をメインアプリとAdmin管理画面に分割して整理
- 認証フローをASCII artで図示
- データフローセクションにAI生成の具体的なフローを記述
- 開発パターンに「AI生成プロンプトを変更する」手順を追加
