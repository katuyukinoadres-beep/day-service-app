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
