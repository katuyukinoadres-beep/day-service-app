# ぱっと記録（Patto Kiroku）

> 放課後等デイサービスの支援記録を「ぱっと」入力できるWebアプリ。スタッフの記録業務を効率化し、AIによる支援記録文の自動生成を提供する。

## プロジェクト情報

| 項目 | 値 |
|------|---|
| 本番URL（メインアプリ） | https://day-service-app.vercel.app |
| 本番URL（管理画面） | https://day-service-admin.vercel.app |
| リポジトリ | https://github.com/{owner}/day-service-app |
| 技術スタック | Next.js 16 / React 19 / TypeScript 5 / Supabase / Tailwind CSS 4 |
| AI | Anthropic Claude API（支援記録生成） |
| ホスティング | Vercel |
| ステータス | 開発中 |
| バージョン | v1.0.0（[CHANGELOG.md](CHANGELOG.md) 参照） |

## クイックスタート

```bash
git clone https://github.com/{owner}/day-service-app.git
cd day-service-app
npm install
cp .env.example .env.local   # 環境変数を編集（→ docs/07_infrastructure.md §3.4 参照）
npm run dev:main              # http://localhost:3000 でメインアプリ起動
npm run dev:admin             # http://localhost:3001 で管理画面起動（別ターミナル）
```

## 主要機能

- **日次支援記録の効率入力** -- 気分、活動、フレーズをタップ選択するだけで記録が完成。未記録児童への自動遷移で連続入力が可能
- **AI支援記録文の自動生成** -- Claude APIにより、入力データから100~200文字の専門的な支援記録文を自動生成
- **マルチテナント対応** -- 施設ごとにデータを完全分離（RLS）。スタッフ招待リンクで簡単にチームを構成
- **帳票出力** -- 業務日誌、サービス提供記録、月間出席サマリーをワンクリックで表示・印刷
- **フレーズバンク** -- 支援領域別の定型フレーズ（20件）を標準搭載。施設独自のカスタムフレーズも追加可能

## モノレポ構成

```
day-service-app/
├── apps/main/          # メインアプリ（@patto/main）
├── apps/admin/         # 管理画面（@patto/admin）
├── packages/shared/    # 共有ライブラリ（@patto/shared）
├── supabase/           # DBマイグレーション
└── docs/               # 設計ドキュメント
```

## ドキュメント

| ドキュメント | 説明 |
|-------------|------|
| [01_要件定義書.md](docs/01_要件定義書.md) | 機能要件・非機能要件 |
| [02_画面設計書.md](docs/02_画面設計書.md) | 画面一覧・ワイヤーフレーム |
| [03_DB設計書.md](docs/03_DB設計書.md) | テーブル定義・ER図・RLSポリシー |
| [04_技術設計書.md](docs/04_技術設計書.md) | アーキテクチャ・技術選定 |
| [05_テスト仕様書.md](docs/05_テスト仕様書.md) | テストケース・テスト方針 |
| [06_API設計書.md](docs/06_API設計書.md) | APIエンドポイント定義 |
| [07_infrastructure.md](docs/07_infrastructure.md) | インフラ・デプロイ・環境構築 |
| [08_security.md](docs/08_security.md) | セキュリティ設計 |
| [09_business_logic.md](docs/09_business_logic.md) | ビジネスロジック仕様 |
| [09_UI詳細仕様書.md](docs/09_UI詳細仕様書.md) | コンポーネント・UI詳細 |
