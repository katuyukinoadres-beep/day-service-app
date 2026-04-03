# データベース設計書

> プロジェクト: **ぱっと記録（Patto Kiroku）**  |  docs-template v1.0 準拠

---

## 1. データベース概要

プロジェクトのデータベース基本情報を示す。

| 項目 | 値 |
|------|---|
| DBMS | PostgreSQL（Supabase マネージド） |
| ホスティング | Supabase |
| 接続方式 | Supabase JavaScript SDK（`@supabase/supabase-js` v2.96.0） |
| スキーマ | `public` |
| 文字コード | UTF-8 |
| タイムゾーン | UTC（アプリ側でJSTに変換） |
| マルチテナント方式 | `facility_id` による論理分離 + RLS |
| テーブル数 | 6個 |

→ 関連: 02_architecture.md &sect;1（技術スタック）

---

## 2. ER図

テーブル間のリレーションシップを示す。

```mermaid
erDiagram
    facilities ||--o{ profiles : "1:N"
    facilities ||--o{ children : "1:N"
    facilities ||--o{ daily_records : "1:N"
    facilities ||--o{ attendances : "1:N"
    facilities ||--o{ phrase_bank : "1:N (nullable)"
    children ||--o{ daily_records : "1:N"
    children ||--o{ attendances : "1:N"
    profiles ||--o{ daily_records : "recorded_by"

    facilities {
        uuid id PK
        text name
        boolean is_active
        text plan
        text notes
        timestamptz created_at
    }
    profiles {
        uuid id PK_FK
        uuid facility_id FK
        text display_name
        text role
        boolean is_super_admin
        timestamptz created_at
    }
    children {
        uuid id PK
        uuid facility_id FK
        text name
        text name_kana
        date birth_date
        text school
        text grade
        text icon_color
        text_arr goals
        text_arr domain_tags
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }
    daily_records {
        uuid id PK
        uuid facility_id FK
        uuid child_id FK
        date date
        text mood
        text_arr activities
        text_arr phrases
        text memo
        text ai_text
        time arrival_time
        time departure_time
        text pickup_method
        uuid recorded_by FK
        timestamptz created_at
        timestamptz updated_at
    }
    attendances {
        uuid id PK
        uuid facility_id FK
        uuid child_id FK
        date date
        boolean is_present
        timestamptz created_at
    }
    phrase_bank {
        uuid id PK
        uuid facility_id FK
        text category
        text text
        text_arr domain_tags
        integer sort_order
        boolean is_default
        timestamptz created_at
    }
```

```
ASCII表現:

[facilities] 1───* [profiles]
     |
     ├── 1───* [children] 1───* [daily_records]
     |              |
     |              └── 1───* [attendances]
     |
     └── 1───* [phrase_bank] (facility_id NULLable: デフォルトフレーズ)

[profiles] 1───* [daily_records] (recorded_by)
```

---

## 3. テーブル定義

### 3.1 `facilities` -- 施設

施設（事業所）の基本情報を管理するテーブル。マルチテナントの基盤となるエンティティ。

| カラム名 | 型 | 制約 | 説明 |
|---------|---|------|------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | 施設一意識別子 |
| `name` | `text` | NOT NULL | 施設名 |
| `is_active` | `boolean` | NOT NULL, DEFAULT `TRUE` | 有効フラグ。Admin管理画面から無効化可能 |
| `plan` | `text` | NULL | 契約プラン（将来の課金対応用） |
| `notes` | `text` | NULL | 管理メモ（Admin管理画面用） |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | 作成日時 |

**インデックス:**

主キーインデックスのみ。

---

### 3.2 `profiles` -- ユーザープロフィール

Supabase Auth のユーザー（`auth.users`）と1:1で紐づくプロフィール情報を管理するテーブル。

| カラム名 | 型 | 制約 | 説明 |
|---------|---|------|------|
| `id` | `uuid` | PK, FK → `auth.users(id)` ON DELETE CASCADE | Supabase Auth のユーザーIDと一致 |
| `facility_id` | `uuid` | FK → `facilities(id)`, NOT NULL | 所属施設ID |
| `display_name` | `text` | NOT NULL | 表示名 |
| `role` | `text` | NOT NULL, DEFAULT `'staff'`, CHECK `IN ('admin', 'staff')` | ロール（`admin`: 管理者 / `staff`: スタッフ） |
| `is_super_admin` | `boolean` | NOT NULL, DEFAULT `FALSE` | スーパー管理者フラグ（Admin管理画面アクセス権限） |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | 作成日時 |

**インデックス:**

| インデックス名 | カラム | 種別 | 目的 |
|--------------|-------|------|------|
| `idx_profiles_facility_id` | `facility_id` | B-tree | 同一施設ユーザーの検索高速化 |

---

### 3.3 `children` -- 児童

施設に所属する児童の情報を管理するテーブル。物理削除は行わず `is_active` フラグによる論理削除を採用。

| カラム名 | 型 | 制約 | 説明 |
|---------|---|------|------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | 児童一意識別子 |
| `facility_id` | `uuid` | FK → `facilities(id)`, NOT NULL | 所属施設ID |
| `name` | `text` | NOT NULL | 氏名 |
| `name_kana` | `text` | NULL | ふりがな（五十音順ソートに使用） |
| `birth_date` | `date` | NULL | 生年月日 |
| `school` | `text` | NULL | 学校名 |
| `grade` | `text` | NULL | 学年 |
| `icon_color` | `text` | NOT NULL, DEFAULT `'#1B6B4A'` | アイコン背景色（HEXカラーコード） |
| `goals` | `text[]` | NOT NULL, DEFAULT `'{}'` | 個別支援目標（配列） |
| `domain_tags` | `text[]` | NOT NULL, DEFAULT `'{}'` | 支援領域タグ（配列）。値は `01_requirements.md` &sect;5.1 参照 |
| `is_active` | `boolean` | NOT NULL, DEFAULT `TRUE` | 有効フラグ（論理削除用） |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | 作成日時 |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | 更新日時（トリガーで自動更新） |

**インデックス:**

| インデックス名 | カラム | 種別 | 目的 |
|--------------|-------|------|------|
| `idx_children_facility_id` | `facility_id` | B-tree | 施設別児童一覧の検索 |
| `idx_children_is_active` | `facility_id, is_active` | B-tree（複合） | 有効な児童の絞り込み |
| `idx_children_name_kana` | `facility_id, name_kana` | B-tree（複合） | 五十音順ソートの高速化 |

**トリガー:**

- `updated_at` を UPDATE 時に自動で `now()` に更新

---

### 3.4 `daily_records` -- 日次記録

児童ごとの日々の支援記録を管理するテーブル。1児童につき1日1レコードの制約あり。

| カラム名 | 型 | 制約 | 説明 |
|---------|---|------|------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | 記録一意識別子 |
| `facility_id` | `uuid` | FK → `facilities(id)`, NOT NULL | 施設ID |
| `child_id` | `uuid` | FK → `children(id)`, NOT NULL | 児童ID |
| `date` | `date` | NOT NULL | 記録日 |
| `mood` | `text` | NULL, CHECK `IN ('good', 'neutral', 'bad')` OR NULL | 気分（`good`/`neutral`/`bad`） |
| `activities` | `text[]` | NOT NULL, DEFAULT `'{}'` | 活動内容（配列）。値は `01_requirements.md` &sect;5.2 参照 |
| `phrases` | `text[]` | NOT NULL, DEFAULT `'{}'` | 選択されたフレーズ（配列） |
| `memo` | `text` | NULL | 自由記述メモ |
| `ai_text` | `text` | NULL | 支援記録まとめ（手入力 or AI生成） |
| `arrival_time` | `time` | NULL | 来所時刻 |
| `departure_time` | `time` | NULL | 退所時刻 |
| `pickup_method` | `text` | NULL | 送迎方法。値は `01_requirements.md` &sect;5.4 参照 |
| `recorded_by` | `uuid` | FK → `profiles(id)`, NULL | 記録者のプロフィールID |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | 作成日時 |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | 更新日時（トリガーで自動更新） |

**ユニーク制約:**

- `(child_id, date)` -- 1児童1日1レコード

**インデックス:**

| インデックス名 | カラム | 種別 | 目的 |
|--------------|-------|------|------|
| `idx_daily_records_facility_date` | `facility_id, date` | B-tree（複合） | 施設別・日付別の記録一覧 |
| `idx_daily_records_child_date` | `child_id, date` | B-tree（複合） | 児童別・日付別の記録検索 |

**トリガー:**

- `updated_at` を UPDATE 時に自動で `now()` に更新

---

### 3.5 `attendances` -- 出席

児童の日別出席情報を管理するテーブル。月間出席サマリーの集計に使用。

| カラム名 | 型 | 制約 | 説明 |
|---------|---|------|------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | 出席レコード一意識別子 |
| `facility_id` | `uuid` | FK → `facilities(id)`, NOT NULL | 施設ID |
| `child_id` | `uuid` | FK → `children(id)`, NOT NULL | 児童ID |
| `date` | `date` | NOT NULL | 日付 |
| `is_present` | `boolean` | NOT NULL, DEFAULT `TRUE` | 出席フラグ |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | 作成日時 |

**ユニーク制約:**

- `(child_id, date)` -- 1児童1日1レコード

**インデックス:**

| インデックス名 | カラム | 種別 | 目的 |
|--------------|-------|------|------|
| `idx_attendances_facility_date` | `facility_id, date` | B-tree（複合） | 施設別・日付別の出席集計 |
| `idx_attendances_child_date` | `child_id, date` | B-tree（複合） | 児童別の出席履歴検索 |

---

### 3.6 `phrase_bank` -- フレーズバンク

記録入力を効率化するための定型文を管理するテーブル。`facility_id` が `NULL` のレコードはデフォルトフレーズ（全施設共通）。

| カラム名 | 型 | 制約 | 説明 |
|---------|---|------|------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | フレーズ一意識別子 |
| `facility_id` | `uuid` | FK → `facilities(id)`, NULL | 施設ID。`NULL` = デフォルトフレーズ（全施設共通） |
| `category` | `text` | NOT NULL | カテゴリ（支援領域名に対応） |
| `text` | `text` | NOT NULL | フレーズテキスト |
| `domain_tags` | `text[]` | NOT NULL, DEFAULT `'{}'` | 関連支援領域タグ（配列） |
| `sort_order` | `integer` | NOT NULL, DEFAULT `0` | 表示順（昇順） |
| `is_default` | `boolean` | NOT NULL, DEFAULT `FALSE` | デフォルトフレーズフラグ（`TRUE` = 編集・削除不可） |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | 作成日時 |

**インデックス:**

| インデックス名 | カラム | 種別 | 目的 |
|--------------|-------|------|------|
| `idx_phrase_bank_facility_id` | `facility_id` | B-tree | 施設別フレーズの検索 |
| `idx_phrase_bank_category` | `category` | B-tree | カテゴリ別表示の高速化 |

---

## 4. Row Level Security (RLS)

### 4.1 基本方針

すべてのテーブルでRLSを有効化する。デフォルトは全拒否とし、必要な操作のみポリシーで許可する。ユーザーの識別には `auth.uid()` を使用し、`profiles` テーブルから取得した `facility_id` と照合することで、自施設のデータのみアクセス可能とする。

Admin管理画面では `service_role` keyを使用してRLSをバイパスし、全施設データにアクセスする。

→ 関連: 02_architecture.md &sect;11 ADR-004

### 4.2 ポリシー定義

全テーブルのRLSポリシーを定義する。

| テーブル | 操作 | ポリシー名 | 条件 |
|---------|------|-----------|------|
| `profiles` | SELECT | `Users can view own profile` | `auth.uid() = id` |
| `profiles` | UPDATE | `Users can update own profile` | `auth.uid() = id` |
| `profiles` | INSERT | 新規登録時ポリシー | サインアップフロー内で `auth.uid()` に一致する行のみINSERT可能 |
| `children` | SELECT | `Users can view facility children` | `facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid())` |
| `children` | INSERT | `Users can insert facility children` | `facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid())` |
| `children` | UPDATE | `Users can update facility children` | `facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid())` |
| `children` | DELETE | ポリシーなし（拒否） | 物理削除は不可。`is_active` フラグによる論理削除のみ |
| `daily_records` | SELECT | `Users can view facility records` | `facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid())` |
| `daily_records` | INSERT | `Users can insert facility records` | `facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid())` |
| `daily_records` | UPDATE | `Users can update facility records` | `facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid())` |
| `daily_records` | DELETE | `Users can delete facility records` | `facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid())` |
| `attendances` | ALL | `Users can manage facility attendances` | `facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid())` |
| `phrase_bank` | SELECT | `Users can view phrases` | `facility_id IS NULL OR facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid())` |
| `phrase_bank` | INSERT | カスタムフレーズ追加 | `facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid())` |
| `phrase_bank` | UPDATE | カスタムフレーズ編集 | `facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid()) AND is_default = FALSE` |
| `phrase_bank` | DELETE | カスタムフレーズ削除 | `facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid()) AND is_default = FALSE` |

**RLSポリシーSQL例（施設分離パターン）:**

```sql
-- 基本パターン: facility_idによる施設分離
CREATE POLICY "Users can view facility children"
  ON children FOR SELECT
  USING (
    facility_id = (
      SELECT facility_id FROM profiles WHERE id = auth.uid()
    )
  );

-- phrase_bank: デフォルトフレーズ（facility_id IS NULL）も許可
CREATE POLICY "Users can view phrases"
  ON phrase_bank FOR SELECT
  USING (
    facility_id IS NULL OR
    facility_id = (
      SELECT facility_id FROM profiles WHERE id = auth.uid()
    )
  );
```

---

## 5. データフロー

### 5.1 主要エンティティのライフサイクル

**児童のライフサイクル:**

1. 新規登録: `children` に INSERT。`facility_id` は現在ユーザーの所属施設、`is_active = TRUE`
2. 情報更新: `children` の各カラムを UPDATE。`updated_at` がトリガーで自動更新
3. 日次記録: 児童に紐づく `daily_records`、`attendances` が日々 INSERT/UPDATE される
4. 論理削除: `is_active = FALSE` に UPDATE。一覧表示から除外されるが、過去の記録は保持
5. 物理削除: RLSポリシーで DELETE 不可。データ保全を優先

**日次記録のライフサイクル:**

1. 新規作成: ホーム画面から児童を選択し、`daily_records` に INSERT
2. 自動復元: 同日の既存記録がある場合、フォームに自動で復元（`child_id` + `date` のユニーク制約による `upsert`）
3. AI生成: `/api/generate-record` 経由でClaude APIを呼び出し、`ai_text` カラムを更新
4. 編集: 記録内容を UPDATE。`updated_at` が自動更新
5. 削除: `daily_records` から DELETE（RLSポリシーで同一施設のみ削除可能）

---

## 6. 初期データ

アプリケーションの初期データ（シードデータ）を定義する。

| テーブル | データ | 目的 | 投入方法 |
|---------|--------|------|---------|
| `phrase_bank` | デフォルトフレーズ（各支援領域カテゴリ別） | ユーザーがすぐに記録入力を開始できるように | `002_seed_phrases.sql` マイグレーション |

`facilities`、`profiles` はユーザーの新規登録時に自動作成される。管理者アカウントの事前作成は不要。

---

## 7. マイグレーション

### 7.1 管理方式

マイグレーションファイルは `supabase/migrations/` ディレクトリに格納する。ファイル名は `{NNN}_{description}.sql` の命名規約に従う（連番 + 説明）。

マイグレーションの適用はSupabase Dashboardの SQL Editor またはSupabase CLIで実行する。ロールバック用のDOWNマイグレーションは作成しない方針とし、問題発生時は新しいマイグレーションで修正する。

### 7.2 マイグレーション履歴

実行済みマイグレーションの履歴を示す。

| 番号 | ファイル名 | 変更内容 | 理由 |
|------|-----------|---------|------|
| 001 | `001_initial_schema.sql` | `facilities`, `profiles`, `children`, `daily_records`, `attendances`, `phrase_bank` テーブル作成。RLSポリシー設定 | 初期スキーマ |
| 002 | `002_seed_phrases.sql` | デフォルトフレーズのINSERT | フレーズバンク初期データ投入 |
| 003 | `003_settings_phase2.sql` | 設定関連のスキーマ変更 | 設定機能の拡充 |
| 004 | `004_signup_policies.sql` | サインアップ時のRLSポリシー追加 | 新規登録フローでのプロフィール作成を許可 |
| 005 | `005_daily_records_unique.sql` | `daily_records` に `(child_id, date)` ユニーク制約追加 | 1児童1日1レコードの整合性担保 |
| 006 | `006_admin_features.sql` | `facilities` に `is_active`, `plan`, `notes` カラム追加。`profiles` に `is_super_admin` カラム追加 | Admin管理画面機能の実装 |
| 007 | `007_ai_text_column.sql` | `daily_records` に `ai_text` カラム追加 | AI支援記録まとめ生成機能の実装 |

---

## 8. データ量見積もり・バックアップ

### データ量見積もり

想定10施設、利用期間12ヶ月での見積もりを示す。

| テーブル | 行数/施設 | 行サイズ目安 | 総データ量（10施設） |
|---------|-----------|------------|-------------------|
| `facilities` | 1 | 200B | 2KB |
| `profiles` | 20 | 200B | 40KB |
| `children` | 100（累積、論理削除含む） | 500B | 500KB |
| `daily_records` | 7,500（30人 x 250日/年） | 1KB | 75MB |
| `attendances` | 7,500（30人 x 250日/年） | 100B | 7.5MB |
| `phrase_bank` | 200（デフォルト + カスタム） | 300B | 600KB |
| **合計** | | | **約 84MB**（上限 500MB の 17%） |

10施設・1年運用で約84MBの見積もり。Supabase Free プランの500MB上限に対して十分な余裕がある。ただし、施設数が50を超える場合は容量監視とProプラン移行の検討が必要。

### バックアップ方針

| 項目 | 内容 |
|------|------|
| 自動バックアップ | Supabase Pro プラン: 日次バックアップ（7日間保持） |
| ポイントインタイムリカバリ | Supabase Pro プラン: 対応 |
| 手動エクスポート | Supabase Dashboard からSQL/CSVエクスポート可能 |
| Free プランの制約 | 自動バックアップなし。手動エクスポートで対応 |

---

## チェックリスト

- [x] データベース概要テーブルが記載されている
- [x] ER図でテーブル間のリレーションが図示されている（Mermaid + ASCII）
- [x] 全テーブルにカラム定義（型・制約・説明）がある
- [x] 主要なインデックスが定義されている
- [x] RLSポリシーが全テーブル x 全操作について定義されている
- [x] 主要エンティティのライフサイクルが記述されている
- [x] 初期データ（シードデータ）が明記されている
- [x] マイグレーション管理方式が定義されている
- [x] データ量見積もりが計算されている
- [x] バックアップ方針が記載されている
- [x] テーブルの前に導入文がある
- [x] カラム名・テーブル名にバッククォートが使われている

---

## 改善メモ

- 旧ドキュメント（`03_DB設計書.md`）からの移行に伴い、テンプレート構造（ER図 Mermaid形式、インデックス定義テーブル、RLSポリシー全操作定義、マイグレーション履歴、データ量見積もり計算、チェックリスト）を新規追加した
- ER図をMermaid `erDiagram` 形式に変換し、ASCII表現も併記
- インデックス定義をテーブルごとに名前・カラム・種別・目的を明示
- RLSポリシーを全テーブル x 全操作の組み合わせで網羅的に定義（`children` のDELETE不可なども明記）
- `phrase_bank` のRLSポリシーにデフォルトフレーズ保護（`is_default = FALSE` チェック）を追加
- マイグレーション履歴を7ファイルすべて記載
- データ量見積もりを10施設・12ヶ月で計算し、Free プラン上限との比較を追加
