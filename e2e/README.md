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

- `auth.spec.ts`: 認証フローのテスト
  - ログインページの表示
  - フォームバリデーション
  - レスポンシブデザイン
  - アクセシビリティ

## TODO

- [ ] チャット機能のE2Eテスト
- [ ] ファイルアップロードのE2Eテスト
- [ ] プロジェクト管理のE2Eテスト
- [ ] ナレッジ管理のE2Eテスト
- [ ] ダークモード切り替えのE2Eテスト
