# API設計書

## プロジェクト名
**ぱっと記録（Patto Kiroku）**

---

## 1. API概要

本アプリケーションは Supabase をバックエンドとして使用しており、REST API は Supabase の自動生成 PostgREST API を通じて提供される。クライアントからは `@supabase/supabase-js` SDK を通じてアクセスする。

### 1.1 ベースURL
```
https://{SUPABASE_PROJECT_ID}.supabase.co
```

### 1.2 認証
- Bearer Token（Supabase Auth JWT）
- すべてのAPIリクエストに `Authorization: Bearer {access_token}` ヘッダーが必要
- Row Level Security (RLS) によりユーザーの施設データのみアクセス可能

---

## 2. 認証API

### 2.1 新規登録
```
POST /auth/v1/signup
```
| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| email | string | ○ | メールアドレス |
| password | string | ○ | パスワード（6文字以上） |

**レスポンス**: `{ user, session }`

### 2.2 ログイン
```
POST /auth/v1/token?grant_type=password
```
| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| email | string | ○ | メールアドレス |
| password | string | ○ | パスワード |

**レスポンス**: `{ access_token, refresh_token, user }`

### 2.3 ログアウト
```
POST /auth/v1/logout
```
**レスポンス**: `204 No Content`

### 2.4 現在ユーザー取得
```
GET /auth/v1/user
```
**レスポンス**: `{ user }`

---

## 3. データAPI（PostgREST）

### 3.1 施設 (facilities)

#### 施設作成
```
POST /rest/v1/facilities
Content-Type: application/json
```
```json
{
  "name": "○○放課後等デイサービス"
}
```
**レスポンス**: `201 Created`

#### 施設情報更新
```
PATCH /rest/v1/facilities?id=eq.{facility_id}
Content-Type: application/json
```
```json
{
  "name": "新しい施設名"
}
```

---

### 3.2 プロフィール (profiles)

#### 自身のプロフィール取得
```
GET /rest/v1/profiles?id=eq.{user_id}&select=*
```
**レスポンス**:
```json
{
  "id": "uuid",
  "facility_id": "uuid",
  "display_name": "田中太郎",
  "role": "admin",
  "created_at": "2026-01-01T00:00:00Z"
}
```

#### プロフィール作成
```
POST /rest/v1/profiles
```
```json
{
  "id": "auth_user_id",
  "facility_id": "facility_uuid",
  "display_name": "表示名",
  "role": "admin"
}
```

#### 表示名更新
```
PATCH /rest/v1/profiles?id=eq.{user_id}
```
```json
{
  "display_name": "新しい表示名"
}
```

#### 施設スタッフ一覧取得
```
GET /rest/v1/profiles?facility_id=eq.{facility_id}&select=*
```

#### ロール変更
```
PATCH /rest/v1/profiles?id=eq.{target_user_id}
```
```json
{
  "role": "admin"
}
```

---

### 3.3 児童 (children)

#### 児童一覧取得（有効のみ）
```
GET /rest/v1/children?is_active=eq.true&order=name_kana.asc&select=*
```
**フィルタ条件**: RLSにより自動的に `facility_id` でフィルタ

**レスポンス**:
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

#### 児童詳細取得
```
GET /rest/v1/children?id=eq.{child_id}&select=*
```

#### 児童新規登録
```
POST /rest/v1/children
```
```json
{
  "facility_id": "uuid",
  "name": "新しい児童",
  "name_kana": "あたらしいじどう",
  "birth_date": "2019-08-20",
  "school": "△△小学校",
  "grade": "2年",
  "icon_color": "#3B82F6",
  "goals": ["目標1"],
  "domain_tags": ["健康・生活"]
}
```

#### 児童情報更新
```
PATCH /rest/v1/children?id=eq.{child_id}
```
```json
{
  "name": "更新後の名前",
  "is_active": false
}
```

---

### 3.4 日次記録 (daily_records)

#### 当日の記録取得
```
GET /rest/v1/daily_records?date=eq.{YYYY-MM-DD}&select=*
```

#### 特定児童の当日記録取得
```
GET /rest/v1/daily_records?child_id=eq.{child_id}&date=eq.{YYYY-MM-DD}&select=*
```
※ `maybeSingle()` で取得（0件またh1件）

#### 記録作成
```
POST /rest/v1/daily_records
```
```json
{
  "facility_id": "uuid",
  "child_id": "uuid",
  "date": "2026-02-22",
  "mood": "good",
  "activities": ["工作", "運動"],
  "phrases": ["集中して取り組めました", "お友達と協力できました"],
  "memo": "今日は特に集中できていました",
  "arrival_time": "14:30",
  "departure_time": "17:30",
  "pickup_method": "送迎車",
  "recorded_by": "user_uuid"
}
```

#### 記録更新
```
PATCH /rest/v1/daily_records?id=eq.{record_id}
```

#### 記録削除
```
DELETE /rest/v1/daily_records?id=eq.{record_id}
```

#### 記録履歴取得（フィルタ付き）
```
GET /rest/v1/daily_records?date=eq.{date}&child_id=eq.{child_id}&order=date.desc&select=*
```

---

### 3.5 出席 (attendances)

#### 月間出席データ取得
```
GET /rest/v1/attendances?date=gte.{YYYY-MM-01}&date=lte.{YYYY-MM-31}&select=*
```

---

### 3.6 フレーズバンク (phrase_bank)

#### フレーズ一覧取得
```
GET /rest/v1/phrase_bank?order=sort_order.asc&select=*
```
※ RLSにより `facility_id = NULL`（デフォルト）+ 自施設のフレーズが返却

#### フレーズ追加
```
POST /rest/v1/phrase_bank
```
```json
{
  "facility_id": "uuid",
  "category": "認知・行動",
  "text": "新しいフレーズ",
  "domain_tags": ["認知・行動"],
  "sort_order": 10
}
```

#### フレーズ更新
```
PATCH /rest/v1/phrase_bank?id=eq.{phrase_id}
```

---

### 3.7 AI文章生成 (generate-record)

#### 支援記録まとめ生成
```
POST /api/generate-record
Content-Type: application/json
```
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
**レスポンス**:
```json
{
  "text": "本日は工作活動でペットボトルロケットの制作に取り組みました。..."
}
```

**エラーレスポンス**:
```json
{
  "error": "API key not configured"
}
```

**備考**:
- サーバーサイドでClaude Sonnet 4.5 API（`claude-sonnet-4-5-20250929`）を呼び出し
- max_tokens: 500
- 児童の年齢を生年月日から自動計算し、年齢・学年に応じた表現で生成
- 環境変数 `ANTHROPIC_API_KEY` が必要

**プロンプト設計方針**:
- 記録フレーズ（5領域：健康・生活、運動・感覚、認知・行動、言語・コミュニケーション、人間関係・社会性）を文章の骨格とし、提供されたフレーズすべてに満遍なく触れる
- スタッフメモは補足情報として扱い、文章全体を支配しないようにする
- 「です・ます」調、3〜5文、活動の様子→本人の反応→今後への前向きな一言の流れで構成

---

### 3.8 Admin管理API (admin-data)

#### 管理データ取得
```
GET /api/admin-data?type={type}
```
| パラメータ | 型 | 説明 |
|---|---|---|
| type | string | `stats`, `facilities`, `facility`, `users`, `user`, `records` |

**備考**:
- `SUPABASE_SERVICE_ROLE_KEY` を使用してRLSをバイパス
- Cookieベースのパスワード認証が必要（`/api/login` で認証）

---

## 4. SDK使用パターン

### 4.1 クライアントサイド使用例

```typescript
// データ取得
const supabase = createClient();
const { data, error } = await supabase
  .from("children")
  .select("*")
  .eq("is_active", true)
  .order("name_kana", { ascending: true });

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

## 5. エラーコード

| HTTPステータス | 説明 | 対応 |
|---|---|---|
| 200 | 成功 | - |
| 201 | 作成成功 | - |
| 204 | 削除成功 | - |
| 400 | リクエスト不正 | 入力値の検証エラー |
| 401 | 認証エラー | ログイン画面へリダイレクト |
| 403 | 権限エラー（RLS） | エラーメッセージ表示 |
| 404 | リソース未検出 | フォールバック表示 |
| 409 | 重複エラー（UNIQUE制約） | エラーメッセージ表示 |
| 500 | サーバーエラー | リトライまたはエラー表示 |
