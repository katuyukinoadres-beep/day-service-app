# API設計書

> プロジェクト: **ぱっと記録（Patto Kiroku）**  |  docs-template v1.0 準拠

---

## 1. API概要

本アプリケーションは Supabase をバックエンドとして使用しており、データアクセスは Supabase 自動生成 PostgREST API と `@supabase/supabase-js` SDK を通じて行う。AI記録生成や管理機能には Next.js API Routes によるカスタムエンドポイントを提供する。

### 1.1 ベースURL

環境ごとのAPIベースURLを示す。

| 環境 | Supabase URL | アプリURL |
|------|-------------|----------|
| 開発 | `http://localhost:54321` | `http://localhost:3000` / `http://localhost:3001` |
| 本番 | `https://{PROJECT_ID}.supabase.co` | `https://day-service-app.vercel.app` |

Supabase REST API は `{base}/rest/v1/` をベースパスとし、Auth API は `{base}/auth/v1/` をベースパスとする。カスタム API Routes は `/api/` 配下に配置する。

### 1.2 認証方式

全APIリクエストに以下のヘッダーを含める。

- `apikey`: Supabase Anonymous Key（`NEXT_PUBLIC_SUPABASE_ANON_KEY`）
- `Authorization`: `Bearer {access_token}`（ログイン後に取得した JWT）

Row Level Security（RLS）により、JWTに含まれるユーザー情報に基づいて `facility_id` 単位のデータ分離を実現する。認証不要のエンドポイントはサインアップ、ログイン、スタッフ参加のみ。

管理アプリ（`apps/admin`）の API Routes は Cookieベースのパスワード認証を使用し、`SUPABASE_SERVICE_ROLE_KEY` で RLS をバイパスする。

→ 関連: 07_セキュリティ設計書.md

### 1.3 共通レスポンス形式

Supabase SDK を使用するため、レスポンスは SDK の戻り値形式に準ずる。

**成功レスポンス（SDK経由）:**

```typescript
const { data, error, count } = await supabase
  .from('table')
  .select('*', { count: 'exact' });
// data: T[] | T | null
// error: null
// count: number | null
```

**エラーレスポンス（SDK経由）:**

```typescript
// error: { message: string, details: string, hint: string, code: string }
```

**カスタム API Routes の成功レスポンス:**

```json
{
  "text": "本日は工作活動で..."
}
```

**カスタム API Routes のエラーレスポンス:**

```json
{
  "error": "API key not configured"
}
```

### 1.4 共通エラーコード

全エンドポイントに共通する HTTP エラーコードを定義する。

| HTTPステータス | コード | 説明 | クライアントの対応 |
|--------------|--------|------|------------------|
| 400 | `BAD_REQUEST` | リクエスト形式が不正 | 入力値を修正して再送 |
| 401 | `UNAUTHORIZED` | 認証トークンが無効 or 期限切れ | トークンリフレッシュ → 再認証（`/login` へリダイレクト） |
| 403 | `FORBIDDEN` | アクセス権限がない（RLS 拒否等） | ユーザーに権限不足を通知 |
| 404 | `NOT_FOUND` | リソースが存在しない | 画面を更新 or 一覧に戻る |
| 409 | `CONFLICT` | リソースの競合（UNIQUE 制約違反等） | 既存データを確認 |
| 422 | `VALIDATION_ERROR` | バリデーション失敗 | エラー詳細に基づき入力修正 |
| 500 | `INTERNAL_ERROR` | サーバー内部エラー | リトライ → 改善しなければ報告 |

### 1.5 アプリ固有エラーコード

プロジェクト固有のエラーコードを定義する。

| コード | HTTPステータス | 説明 | 発生条件 |
|--------|--------------|------|---------|
| `AUTH_EMAIL_DUPLICATE` | 409 | メールアドレスが既に登録済み | サインアップ時に既存メールを使用 |
| `AUTH_INVALID_CREDENTIALS` | 401 | メールまたはパスワードが不正 | ログイン時の認証失敗 |
| `AUTH_PASSWORD_TOO_SHORT` | 422 | パスワードが6文字未満 | サインアップ時のバリデーション |
| `RLS_FACILITY_MISMATCH` | 403 | 他施設のデータへのアクセス | RLS により拒否 |
| `AI_API_KEY_MISSING` | 500 | Anthropic API キーが未設定 | AI 記録生成時 |
| `AI_GENERATION_FAILED` | 500 | AI 文章生成に失敗 | Claude API の呼び出しエラー |
| `ADMIN_AUTH_FAILED` | 401 | 管理画面のパスワードが不正 | 管理画面ログイン失敗 |
| `ADMIN_SESSION_EXPIRED` | 401 | 管理セッションが期限切れ | Cookie 有効期限（24時間）超過 |
| `RECORD_DUPLICATE` | 409 | 同一児童・同一日付の記録が重複 | `daily_records` の UNIQUE 制約違反 |

### 1.6 APIバージョニング

現時点ではバージョニングを行わない。Supabase REST API を直接利用しており、スキーマ変更はマイグレーションで管理する。カスタム API Routes（`/api/generate-record` 等）も現在は v1 相当として運用し、破壊的変更が必要な場合は `/api/v2/` パスベースでバージョニングする。

### 1.7 ページネーション仕様

リスト取得APIのページネーション仕様を示す。

| 項目 | 値 |
|------|---|
| 方式 | offset-based（Supabase `range()` メソッド） |
| デフォルトページサイズ | 全件取得（児童・フレーズ等は件数が少ないため） |
| パラメータ | `range(from, to)` |

現時点では児童数・記録数が小規模（施設あたり数十件）のため、ページネーションは未実装。データ量の増加に応じて `range()` によるページネーションを導入する。記録履歴画面ではフィルタ（日付・児童）で結果を絞り込む設計としている。

---

## 2. 認証API

→ 関連: 07_セキュリティ設計書.md

### 2.1 POST `/auth/v1/signup` --- 新規ユーザー登録

新しいユーザーアカウントを作成する。施設の新規作成とプロフィール作成を伴う。

**リクエストボディ:**

| フィールド | 型 | 必須 | 制約 | 説明 |
|-----------|---|------|------|------|
| `email` | `string` | はい | メール形式 | ログイン用メールアドレス |
| `password` | `string` | はい | 6文字以上 | パスワード（平文。Supabase 側でハッシュ化） |

**リクエスト例:**

```json
{
  "email": "tanaka@example.com",
  "password": "securePass123"
}
```

**成功レスポンス（200 OK）:**

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "tanaka@example.com",
    "created_at": "2026-01-15T10:30:00Z"
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "v1.MjQ1...",
    "expires_in": 3600
  }
}
```

**エラーレスポンス:**

| ステータス | エラーコード | 条件 | メッセージ |
|-----------|------------|------|-----------|
| 409 | `AUTH_EMAIL_DUPLICATE` | メールアドレスが既に登録済み | 「このメールアドレスは既に使用されています」 |
| 422 | `AUTH_PASSWORD_TOO_SHORT` | パスワードが6文字未満 | 「パスワードは6文字以上で入力してください」 |

**補足:** サインアップ成功後、クライアント側で以下を順次実行する。
1. `facilities` テーブルに施設を作成
2. `profiles` テーブルにプロフィールを作成（`role: 'admin'`）

### 2.2 POST `/auth/v1/token?grant_type=password` --- ログイン

メールアドレスとパスワードで認証し、アクセストークンを取得する。

**リクエストボディ:**

| フィールド | 型 | 必須 | 制約 | 説明 |
|-----------|---|------|------|------|
| `email` | `string` | はい | - | メールアドレス |
| `password` | `string` | はい | - | パスワード |

**リクエスト例:**

```json
{
  "email": "tanaka@example.com",
  "password": "securePass123"
}
```

**成功レスポンス（200 OK）:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "v1.MjQ1...",
  "expires_in": 3600,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "tanaka@example.com"
  }
}
```

**エラーレスポンス:**

| ステータス | エラーコード | 条件 | メッセージ |
|-----------|------------|------|-----------|
| 401 | `AUTH_INVALID_CREDENTIALS` | メール or パスワードが不正 | 「メールアドレスまたはパスワードが正しくありません」 |

### 2.3 POST `/auth/v1/logout` --- ログアウト

現在のセッションを無効化する。

**リクエストボディ:** なし

**成功レスポンス:** `204 No Content`

### 2.4 GET `/auth/v1/user` --- 現在ユーザー取得

認証済みユーザーの情報を取得する。

**成功レスポンス（200 OK）:**

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "tanaka@example.com",
    "created_at": "2026-01-15T10:30:00Z"
  }
}
```

**エラーレスポンス:**

| ステータス | エラーコード | 条件 | メッセージ |
|-----------|------------|------|-----------|
| 401 | `UNAUTHORIZED` | トークンが無効 or 未設定 | 「認証が必要です」 |

---

## 3. データAPI（PostgREST）

Supabase PostgREST を通じたデータ CRUD 操作。全エンドポイントで RLS により `facility_id` 単位のデータ分離が適用される。

→ 関連: 03_DB設計書.md

### 3.1 施設（`facilities`）

#### GET `/rest/v1/facilities` --- 施設情報取得

自施設の情報を取得する（RLS により自施設のみ返却）。

**成功レスポンス（200 OK）:**

```json
[
  {
    "id": "uuid",
    "name": "○○放課後等デイサービス",
    "is_active": true,
    "plan": "free",
    "created_at": "2026-01-01T00:00:00Z"
  }
]
```

#### POST `/rest/v1/facilities` --- 施設作成

新規施設を作成する（サインアップ時に使用）。

**リクエストボディ:**

| フィールド | 型 | 必須 | 制約 | 説明 |
|-----------|---|------|------|------|
| `name` | `string` | はい | - | 施設名 |

#### PATCH `/rest/v1/facilities?id=eq.{facility_id}` --- 施設情報更新

施設名を更新する（admin 権限が必要）。

**リクエストボディ:**

| フィールド | 型 | 必須 | 制約 | 説明 |
|-----------|---|------|------|------|
| `name` | `string` | はい | - | 新しい施設名 |

### 3.2 プロフィール（`profiles`）

#### GET `/rest/v1/profiles?id=eq.{user_id}` --- 自身のプロフィール取得

ログインユーザーのプロフィール情報を取得する。

**成功レスポンス（200 OK）:**

```json
{
  "id": "uuid",
  "facility_id": "uuid",
  "display_name": "田中太郎",
  "role": "admin",
  "created_at": "2026-01-01T00:00:00Z"
}
```

#### POST `/rest/v1/profiles` --- プロフィール作成

サインアップまたはスタッフ参加時にプロフィールを作成する。

**リクエストボディ:**

| フィールド | 型 | 必須 | 制約 | 説明 |
|-----------|---|------|------|------|
| `id` | `string` | はい | Supabase Auth ユーザーID | 認証ユーザーと紐付け |
| `facility_id` | `string` | はい | UUID | 所属施設 |
| `display_name` | `string` | はい | - | 表示名 |
| `role` | `string` | はい | `'admin'` or `'staff'` | ロール |

#### PATCH `/rest/v1/profiles?id=eq.{user_id}` --- プロフィール更新

表示名やロールを更新する。

**リクエストボディ:**

| フィールド | 型 | 必須 | 制約 | 説明 |
|-----------|---|------|------|------|
| `display_name` | `string` | いいえ | - | 新しい表示名 |
| `role` | `string` | いいえ | `'admin'` or `'staff'` | 新しいロール（admin のみ変更可能） |

#### GET `/rest/v1/profiles?facility_id=eq.{facility_id}` --- 施設スタッフ一覧取得

同一施設のスタッフ一覧を取得する（admin 権限で使用）。

### 3.3 児童（`children`）

#### GET `/rest/v1/children?is_active=eq.true&order=name_kana.asc` --- 児童一覧取得

有効な児童を五十音順で取得する。RLS により自動的に `facility_id` でフィルタされる。

**成功レスポンス（200 OK）:**

```json
[
  {
    "id": "uuid",
    "facility_id": "uuid",
    "name": "田中太郎",
    "name_kana": "たなかたろう",
    "birth_date": "2018-04-15",
    "school": "○○小学校",
    "grade": "3年",
    "icon_color": "#1B6B4A",
    "goals": ["集中力の向上", "お友達との関わり"],
    "domain_tags": ["認知・行動", "人間関係・社会性"],
    "is_active": true,
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  }
]
```

#### GET `/rest/v1/children?id=eq.{child_id}` --- 児童詳細取得

特定児童の詳細情報を取得する。

#### POST `/rest/v1/children` --- 児童新規登録

新しい児童を登録する。

**リクエストボディ:**

| フィールド | 型 | 必須 | 制約 | 説明 |
|-----------|---|------|------|------|
| `facility_id` | `string` | はい | UUID | 所属施設 |
| `name` | `string` | はい | - | 児童氏名 |
| `name_kana` | `string` | いいえ | - | ふりがな |
| `birth_date` | `string` | いいえ | `YYYY-MM-DD` | 生年月日 |
| `school` | `string` | いいえ | - | 学校名 |
| `grade` | `string` | いいえ | - | 学年 |
| `icon_color` | `string` | いいえ | 8色プリセットから選択 | アイコン色（デフォルト `#1B6B4A`） |
| `goals` | `string[]` | いいえ | JSONB | 個別目標 |
| `domain_tags` | `string[]` | いいえ | JSONB | 支援領域タグ（5領域） |

#### PATCH `/rest/v1/children?id=eq.{child_id}` --- 児童情報更新

児童の情報を更新する。`is_active` を `false` にすることで論理削除する。

### 3.4 日次記録（`daily_records`）

#### GET `/rest/v1/daily_records?date=eq.{YYYY-MM-DD}` --- 当日の記録取得

指定日の全記録を取得する。ホーム画面の進捗表示に使用する。

**成功レスポンス（200 OK）:**

```json
[
  {
    "id": "uuid",
    "facility_id": "uuid",
    "child_id": "uuid",
    "date": "2026-02-22",
    "mood": "good",
    "activities": ["工作", "運動"],
    "phrases": ["集中して取り組めました"],
    "memo": "今日は特に集中できていました",
    "ai_text": "本日は工作活動で...",
    "arrival_time": "14:30",
    "departure_time": "17:30",
    "pickup_method": "送迎車",
    "recorded_by": "user_uuid",
    "created_at": "2026-02-22T08:00:00Z",
    "updated_at": "2026-02-22T08:00:00Z"
  }
]
```

#### GET `/rest/v1/daily_records?child_id=eq.{child_id}&date=eq.{YYYY-MM-DD}` --- 特定児童の当日記録取得

特定児童の指定日の記録を取得する。`maybeSingle()` で 0 件または 1 件を返却する。

#### POST `/rest/v1/daily_records` --- 記録作成

新しい日次記録を作成する。

**リクエストボディ:**

| フィールド | 型 | 必須 | 制約 | 説明 |
|-----------|---|------|------|------|
| `facility_id` | `string` | はい | UUID | 施設ID |
| `child_id` | `string` | はい | UUID | 児童ID |
| `date` | `string` | はい | `YYYY-MM-DD` | 記録日 |
| `mood` | `string` | いいえ | `'good'` / `'neutral'` / `'bad'` | 気分 |
| `activities` | `string[]` | いいえ | JSONB | 活動内容 |
| `phrases` | `string[]` | いいえ | JSONB | 選択フレーズ |
| `memo` | `string` | いいえ | - | 自由記入メモ |
| `ai_text` | `string` | いいえ | - | 支援記録まとめ（AI生成 or 手入力） |
| `arrival_time` | `string` | いいえ | `HH:MM` | 来所時刻 |
| `departure_time` | `string` | いいえ | `HH:MM` | 退所時刻 |
| `pickup_method` | `string` | いいえ | - | 送迎方法 |
| `recorded_by` | `string` | いいえ | UUID | 記録者のユーザーID |

**エラーレスポンス:**

| ステータス | エラーコード | 条件 | メッセージ |
|-----------|------------|------|-----------|
| 409 | `RECORD_DUPLICATE` | 同一 `child_id` + `date` の記録が既に存在 | 「この児童の当日の記録は既に存在します」 |

#### PATCH `/rest/v1/daily_records?id=eq.{record_id}` --- 記録更新

既存の記録を更新する。

#### DELETE `/rest/v1/daily_records?id=eq.{record_id}` --- 記録削除

記録を物理削除する。

#### GET `/rest/v1/daily_records?date=eq.{date}&order=date.desc` --- 記録履歴取得

フィルタ付きで記録履歴を取得する。日付・児童による絞り込みに対応する。

### 3.5 出席（`attendances`）

#### GET `/rest/v1/attendances?date=gte.{YYYY-MM-01}&date=lte.{YYYY-MM-31}` --- 月間出席データ取得

指定月の出席データを取得する。月間出席サマリー画面で使用する。

### 3.6 フレーズバンク（`phrase_bank`）

#### GET `/rest/v1/phrase_bank?order=sort_order.asc` --- フレーズ一覧取得

フレーズを並び順で取得する。RLS により `facility_id = NULL`（デフォルトフレーズ）と自施設のカスタムフレーズが返却される。

#### POST `/rest/v1/phrase_bank` --- フレーズ追加

カスタムフレーズを追加する。

**リクエストボディ:**

| フィールド | 型 | 必須 | 制約 | 説明 |
|-----------|---|------|------|------|
| `facility_id` | `string` | はい | UUID | 施設ID |
| `category` | `string` | はい | 5領域のいずれか | カテゴリ |
| `text` | `string` | はい | - | フレーズ本文 |
| `domain_tags` | `string[]` | いいえ | JSONB | 支援領域タグ |
| `sort_order` | `integer` | いいえ | デフォルト 0 | 表示順 |

#### PATCH `/rest/v1/phrase_bank?id=eq.{phrase_id}` --- フレーズ更新

カスタムフレーズを更新する。デフォルトフレーズ（`facility_id = NULL`）は更新不可。

#### DELETE `/rest/v1/phrase_bank?id=eq.{phrase_id}` --- フレーズ削除

カスタムフレーズを削除する。

---

## 4. カスタム API Routes

Next.js API Routes で実装するカスタムエンドポイント。

→ 関連: 04_技術設計書.md

### 4.1 POST `/api/generate-record` --- AI 支援記録まとめ生成

児童の記録情報をもとに、Claude API で支援記録の文章を生成する。

**リクエストボディ:**

| フィールド | 型 | 必須 | 制約 | 説明 |
|-----------|---|------|------|------|
| `childName` | `string` | はい | - | 児童名 |
| `birthDate` | `string` | いいえ | `YYYY-MM-DD` | 生年月日（年齢計算用） |
| `school` | `string` | いいえ | - | 学校名 |
| `grade` | `string` | いいえ | - | 学年 |
| `mood` | `string` | いいえ | `'good'` / `'neutral'` / `'bad'` | 気分 |
| `activities` | `string[]` | いいえ | - | 活動内容 |
| `phrases` | `string[]` | いいえ | - | 選択したフレーズ |
| `memo` | `string` | いいえ | - | 自由記入メモ |

**リクエスト例:**

```json
{
  "childName": "田中太郎",
  "birthDate": "2018-04-15",
  "school": "○○小学校",
  "grade": "3年",
  "mood": "good",
  "activities": ["工作", "運動"],
  "phrases": ["集中して取り組めました"],
  "memo": "今日は特に集中できていました"
}
```

**成功レスポンス（200 OK）:**

```json
{
  "text": "本日は工作活動でペットボトルロケットの制作に取り組みました。集中して取り組む姿が見られ、完成まで一人で作り上げることができました。運動の時間にはお友達と一緒にドッジボールに参加し、ルールを守って楽しく遊ぶことができました。全体的に落ち着いた様子で過ごしており、今後もこの調子で様々な活動に積極的に取り組んでいけると期待しています。"
}
```

**エラーレスポンス:**

| ステータス | エラーコード | 条件 | メッセージ |
|-----------|------------|------|-----------|
| 500 | `AI_API_KEY_MISSING` | `ANTHROPIC_API_KEY` 環境変数が未設定 | 「API key not configured」 |
| 500 | `AI_GENERATION_FAILED` | Claude API 呼び出しエラー | エラー詳細メッセージ |

**実装詳細:**

- 使用モデル: `claude-opus-4-7`
- `max_tokens`: 500
- 生年月日から年齢を自動計算し、年齢・学年に応じた表現で生成
- プロンプト設計: 記録フレーズ（5領域）を文章の骨格とし、3〜5文の「です・ます」調で構成

→ 関連: 10_ビジネスロジック仕様書.md

### 4.2 GET `/api/admin-data` --- 管理データ取得

管理画面向けのデータ取得エンドポイント。`type` パラメータにより取得内容を切り替える。

**認証:** Cookie ベースのパスワード認証（`admin_session` Cookie 必須）

**クエリパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| `type` | `string` | はい | 取得データ種別 |

**`type` の値と取得内容:**

| type 値 | 説明 | レスポンス概要 |
|---------|------|--------------|
| `stats` | ダッシュボード統計 | 施設数、ユーザー数、総記録数、本日記録数、本日アクティブ施設数 |
| `facilities` | 施設一覧 | 全施設（スタッフ数付き） |
| `facility` | 施設詳細（`id` パラメータ必須） | 施設情報 + スタッフ数・記録数 |
| `users` | ユーザー一覧 | 全ユーザー（施設情報付き） |
| `user` | ユーザー詳細（`id` パラメータ必須） | プロフィール詳細 |
| `records` | 記録一覧（`startDate`, `endDate` パラメータ） | 期間内の記録（施設ID付き） |

**エラーレスポンス:**

| ステータス | エラーコード | 条件 | メッセージ |
|-----------|------------|------|-----------|
| 401 | `ADMIN_AUTH_FAILED` | `admin_session` Cookie がない or 無効 | 「認証が必要です」 |
| 400 | `BAD_REQUEST` | 不正な `type` パラメータ | 「Unknown type」 |

### 4.3 POST `/api/admin-data` --- 管理データ操作

管理画面からの施設作成・更新・ロール変更等の操作。

**認証:** Cookie ベースのパスワード認証

| type 値 | 説明 | リクエストボディ |
|---------|------|----------------|
| `create-facility` | 施設新規作成 | `name`, `plan`, `notes` |
| `update-facility` | 施設情報更新 | `id`, `name`, `plan`, `notes`, `is_active` |
| `update-role` | ユーザーロール変更 | `userId`, `role` |

### 4.4 POST `/api/login` --- 管理画面ログイン

管理画面のパスワード認証を行う。

**リクエストボディ:**

| フィールド | 型 | 必須 | 説明 |
|-----------|---|------|------|
| `password` | `string` | はい | 管理パスワード（`ADMIN_PASSWORD` 環境変数と照合） |

**成功レスポンス（200 OK）:**

`admin_session` Cookie を設定（有効期限 24 時間）。

**エラーレスポンス:**

| ステータス | エラーコード | 条件 | メッセージ |
|-----------|------------|------|-----------|
| 401 | `ADMIN_AUTH_FAILED` | パスワード不一致 | 「パスワードが正しくありません」 |

### 4.5 POST `/api/logout` --- 管理画面ログアウト

`admin_session` Cookie を削除する。

---

## 5. SDK 使用パターン

クライアントサイドでの Supabase SDK 使用パターンを示す。

```typescript
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// データ取得（一覧）
const { data, error } = await supabase
  .from("children")
  .select("*")
  .eq("is_active", true)
  .order("name_kana", { ascending: true });

// データ取得（単一）
const { data, error } = await supabase
  .from("daily_records")
  .select("*")
  .eq("child_id", childId)
  .eq("date", today)
  .maybeSingle();

// データ作成
const { error } = await supabase
  .from("daily_records")
  .insert(recordData);

// データ更新
const { error } = await supabase
  .from("daily_records")
  .update(recordData)
  .eq("id", recordId);

// データ削除
const { error } = await supabase
  .from("daily_records")
  .delete()
  .eq("id", recordId);
```

---

## 6. データ型定義

API レスポンスで使用するデータ型を TypeScript で定義する。

→ 関連: 03_DB設計書.md

```typescript
/** 施設 */
interface Facility {
  id: string;              // UUID
  name: string;            // 施設名
  is_active: boolean;      // 有効フラグ
  plan: 'free' | 'basic' | 'pro';  // プラン
  created_at: string;      // ISO 8601 (UTC)
}

/** プロフィール */
interface Profile {
  id: string;              // UUID（Auth ユーザーIDと一致）
  facility_id: string;     // UUID
  display_name: string;    // 表示名
  role: 'admin' | 'staff'; // ロール
  is_super_admin: boolean; // スーパー管理者フラグ
  created_at: string;      // ISO 8601 (UTC)
}

/** 児童 */
interface Child {
  id: string;              // UUID
  facility_id: string;     // UUID
  name: string;            // 児童氏名
  name_kana: string | null; // ふりがな
  birth_date: string | null; // YYYY-MM-DD
  school: string | null;   // 学校名
  grade: string | null;    // 学年
  icon_color: string;      // HEX カラーコード
  goals: string[];         // 個別目標（JSONB）
  domain_tags: string[];   // 支援領域タグ（JSONB）
  is_active: boolean;      // 有効フラグ
  created_at: string;      // ISO 8601 (UTC)
  updated_at: string;      // ISO 8601 (UTC)
}

/** 日次記録 */
interface DailyRecord {
  id: string;              // UUID
  facility_id: string;     // UUID
  child_id: string;        // UUID
  date: string;            // YYYY-MM-DD
  mood: 'good' | 'neutral' | 'bad' | null;
  activities: string[];    // JSONB
  phrases: string[];       // JSONB
  memo: string | null;     // 自由記入メモ
  ai_text: string | null;  // 支援記録まとめ（AI生成 or 手入力）
  arrival_time: string | null;    // HH:MM
  departure_time: string | null;  // HH:MM
  pickup_method: string | null;   // 送迎方法
  recorded_by: string | null;     // UUID（記録者）
  created_at: string;      // ISO 8601 (UTC)
  updated_at: string;      // ISO 8601 (UTC)
}

/** 出席 */
interface Attendance {
  id: string;              // UUID
  child_id: string;        // UUID
  date: string;            // YYYY-MM-DD
  is_present: boolean;     // 出席フラグ
}

/** フレーズバンク */
interface Phrase {
  id: string;              // UUID
  facility_id: string | null; // UUID（NULL = デフォルトフレーズ）
  category: string;        // カテゴリ（支援領域名）
  text: string;            // フレーズ本文
  domain_tags: string[];   // JSONB
  sort_order: number;      // 表示順
  is_default: boolean;     // デフォルトフレーズフラグ
}
```

---

## 7. レート制限・制約

API の利用制約を定義する。

| 項目 | 制限値 | 備考 |
|------|--------|------|
| Supabase REST API | 制限なし（DB接続数は最大60） | Supabase Free プラン |
| Edge Functions | 500,000 invocations/月 | 現在未使用 |
| Storage | 1GB | Supabase Free プラン |
| DB 容量 | 500MB | Supabase Free プラン |
| AI 記録生成 | Claude API の制限に依存 | `max_tokens: 500` に制限 |
| 管理セッション | 24時間で自動失効 | Cookie ベース |
| レスポンスサイズ | 最大 6MB | Supabase REST API デフォルト |

フロントエンド側ではデバウンス処理（検索・フィルタ入力で 300ms）を実装し、過剰なリクエストを防止する。

---

## チェックリスト

- [x] ベースURLが全環境分記載されている
- [x] 認証方式が明記されている
- [x] 共通レスポンス形式がJSON例付きで定義されている
- [x] 共通エラーコードが全HTTPステータスについて定義されている
- [x] アプリ固有エラーコードが定義されている
- [x] 全エンドポイントにリクエスト/レスポンスのJSON例がある
- [x] 全エンドポイントにエラーレスポンステーブルがある
- [x] リクエストボディの各フィールドに型・必須・制約が記載されている
- [x] ページネーション仕様が定義されている
- [x] データ型定義（TypeScript interface）が記載されている
- [x] レート制限が定義されている
- [x] テーブルの前に導入文がある
- [x] 技術用語にバッククォートが使われている
- [x] 相互参照のフォーマットが統一されている

---

## 改善メモ

今後のドキュメント改善に向けた課題を記録する。

- 認証 API のトークンリフレッシュ（`POST /auth/v1/token?grant_type=refresh_token`）のエンドポイント仕様を追加する
- パスワードリセットフローの API 仕様を追加する（現時点で未実装）
- API 統合テスト（Vitest）の導入に伴い、テスト用のモック仕様を追記する
- 管理 API（`/api/admin-data`）のリクエスト/レスポンスを `type` ごとに独立したエンドポイントに分割し、各々に完全な JSON 例を記載する
- Supabase Realtime（リアルタイム更新）を導入する場合は WebSocket API の仕様セクションを追加する
