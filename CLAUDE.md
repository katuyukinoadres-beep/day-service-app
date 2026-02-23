# CLAUDE.md - day-service-app

## プロジェクト概要
放課後等デイサービス支援記録アプリ「ぱっと記録」のモノレポ。

## 構成
- `apps/main` - メインアプリ（Next.js / Vercel）
- `apps/admin` - 管理画面（Next.js / Vercel）
- `packages/shared` - 共有ライブラリ
- `docs/` - 設計ドキュメント一式

## デプロイ
- メインアプリ: `day-service-app.vercel.app`（Vercel CLIでルートから `npx vercel --prod --yes`）
- Vercelプロジェクト設定: `.vercel/project.json` にリンク済み

## アプリ改造時の自動実行フロー
コード変更を依頼されたら、以下を一気通貫で実行すること。途中で確認が必要な場合のみユーザーに聞く。

1. ブランチ作成（`main` から切る）
2. コード実装
3. ドキュメント更新（影響範囲を自動判定し、該当する設計書を更新）
   - `docs/01_要件定義書.md` - 機能要件に変更がある場合
   - `docs/02_画面設計書.md` - UI変更がある場合
   - `docs/03_DB設計書.md` - DB変更がある場合
   - `docs/04_技術設計書.md` - アーキテクチャ変更がある場合
   - `docs/05_テスト仕様書.md` - テストケース追加・変更が必要な場合
   - `docs/06_API設計書.md` - API変更がある場合
   - `docs/07_セキュリティ設計書.md` - セキュリティに影響する場合
   - `docs/08_インフラ構成書.md` - インフラ変更がある場合
4. コミット
5. PR作成
6. マージ
7. デプロイ（`npx vercel --prod --yes`）
8. 実機確認（ブラウザでデプロイ先を開いて確認）
