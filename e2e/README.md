# E2E Tests

このディレクトリには、Playwrightを使用したエンドツーエンドテストが含まれています。

## セットアップ

```bash
# Playwrightのインストール（既に完了済み）
npm install --save-dev @playwright/test

# Playwrightブラウザのインストール
npx playwright install
```

## テストの実行

```bash
# すべてのE2Eテストを実行
npx playwright test

# 特定のテストファイルを実行
npx playwright test e2e/auth.spec.ts

# ヘッドモードで実行（ブラウザを表示）
npx playwright test --headed

# 特定のブラウザでのみ実行
npx playwright test --project=chromium

# UIモードで実行（対話的）
npx playwright test --ui

# デバッグモードで実行
npx playwright test --debug
```

## テストレポート

```bash
# HTMLレポートを表示
npx playwright show-report
```

## テストの書き方

```typescript
import { test, expect } from '@playwright/test';

test('テストの説明', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Hello')).toBeVisible();
});
```

## ベストプラクティス

1. **独立性**: 各テストは他のテストに依存しない
2. **安定性**: `waitFor`を使用して要素の表示を待つ
3. **可読性**: テストの意図が明確になるよう説明的な名前を使用
4. **保守性**: Page Object Modelパターンの使用を検討

## 現在のテスト

### `auth.spec.ts` - 認証フローのテスト
  - ログインページの表示
  - フォームバリデーション
  - レスポンシブデザイン
  - アクセシビリティ
  - キーボードナビゲーション

### `batch-jobs.spec.ts` - バッチジョブモニタリングのテスト
  - バッチジョブ一覧表示
  - 手動ジョブトリガー（管理者のみ）
  - リアルタイム進捗更新
  - ジョブ結果の可視化
  - エラーハンドリング
  - 非管理者のアクセス制限
  - レスポンシブデザイン
  - ネットワークエラーハンドリング

### `core-features.spec.ts` - コア機能のテスト
  - **プロジェクト管理**
    - プロジェクト一覧表示
    - プロジェクト作成
    - プロジェクト選択・展開
  - **チャンネル管理**
    - チャンネル一覧表示
    - チャンネル作成
    - チャンネル選択
  - **チャット機能**
    - チャットインターフェース表示
    - メッセージ送信
    - チャット履歴表示
    - ローディング状態
  - **ナレッジ検索**
    - 検索機能
    - プロジェクトフィルタリング
  - **ファイルアップロード**
    - アップロードボタン表示
    - アップロードダイアログ
  - **承認ワークフロー**
    - 承認ボタン表示
    - メッセージ承認
  - **ナビゲーション**
    - サイドバートグル
    - 管理ダッシュボード
    - パフォーマンスダッシュボード
    - ログアウト

## 環境変数

E2Eテストで使用する環境変数:

```bash
# テスト用管理者アカウント
TEST_ADMIN_EMAIL=admin@trias.co.jp
TEST_ADMIN_PASSWORD=testpassword123

# テスト用一般ユーザーアカウント
TEST_EMPLOYEE_EMAIL=employee@trias.co.jp
TEST_EMPLOYEE_PASSWORD=testpassword123
```

## TODO

- [x] チャット機能のE2Eテスト
- [x] プロジェクト管理のE2Eテスト
- [x] バッチジョブモニタリングのE2Eテスト
- [ ] ダークモード切り替えのE2Eテスト
- [ ] コスト監視ダッシュボードのE2Eテスト
- [ ] 重複検出機能のE2Eテスト
