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
