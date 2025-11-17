# ET-AI デプロイメントガイド

このドキュメントでは、ET-AIアプリケーションのデプロイメント手順を説明します。

---

## 📋 目次

1. [前提条件](#前提条件)
2. [環境設定](#環境設定)
3. [ローカル開発](#ローカル開発)
4. [ステージング環境へのデプロイ](#ステージング環境へのデプロイ)
5. [プロダクション環境へのデプロイ](#プロダクション環境へのデプロイ)
6. [CI/CD](#cicd)
7. [トラブルシューティング](#トラブルシューティング)

---

## 前提条件

### 必要なツール

- Node.js 20.x以上
- npm 10.x以上
- Firebase CLI (`npm install -g firebase-tools`)
- Git

### 必要なアカウント

- Firebase プロジェクト（dev/staging/production）
- Anthropic API キー
- Voyage AI API キー
- GitHub アカウント（CI/CD用）
- Sentry アカウント（オプション、エラートラッキング用）

---

## 環境設定

### 1. Firebase プロジェクトの作成

開発環境、ステージング環境、プロダクション環境用に3つのFirebaseプロジェクトを作成します。

```bash
# Firebase CLI でログイン
firebase login

# プロジェクトのリスト確認
firebase projects:list
```

### 2. 環境変数の設定

各環境用の `.env` ファイルを作成します。

#### 開発環境 (.env.development)

```bash
# .env.development をコピー
cp .env.development .env.local

# 必要な値を設定
VITE_FIREBASE_API_KEY=your-dev-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-dev.firebaseapp.com
# ... 他の値も設定
```

#### ステージング環境 (.env.staging)

```bash
VITE_FIREBASE_API_KEY=your-staging-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-staging.firebaseapp.com
# ... 他の値も設定
```

#### プロダクション環境 (.env.production)

```bash
VITE_FIREBASE_API_KEY=your-production-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
# ... 他の値も設定
```

### 3. Firebase 設定

#### Firestore の初期化

```bash
# Firestoreルールのデプロイ
firebase deploy --only firestore:rules --project your-project-id

# Firestoreインデックスのデプロイ
firebase deploy --only firestore:indexes --project your-project-id
```

#### Storage の初期化

```bash
# Storageルールのデプロイ
firebase deploy --only storage --project your-project-id
```

#### Cloud Functions の環境変数設定

```bash
cd functions

# 環境変数の設定
firebase functions:config:set \
  voyage.api_key="your-voyage-api-key" \
  --project your-project-id

# 設定の確認
firebase functions:config:get --project your-project-id
```

---

## ローカル開発

### 1. 依存関係のインストール

```bash
# ルートディレクトリ
npm install

# Cloud Functions
cd functions
npm install
cd ..
```

### 2. Firebase Emulators の起動

```bash
# Firebase Emulatorsの起動
firebase emulators:start
```

利用可能なエミュレータ:
- Firestore: `http://localhost:8080`
- Cloud Functions: `http://localhost:5001`
- Storage: `http://localhost:9199`
- Authentication: `http://localhost:9099`

### 3. 開発サーバーの起動

```bash
# Vite開発サーバー
npm run dev
```

アプリケーション: `http://localhost:5173`

### 4. テストの実行

```bash
# ユニット・統合テスト
npm test

# カバレッジレポート
npm run test:coverage

# Cloud Functions テスト
cd functions
npm test
```

---

## ステージング環境へのデプロイ

### 手動デプロイ

```bash
# 1. ビルド
VITE_ENVIRONMENT=staging npm run build

# 2. Firebase Hosting へデプロイ
firebase deploy --only hosting --project your-project-staging

# 3. Cloud Functions へデプロイ
cd functions
npm run build
firebase deploy --only functions --project your-project-staging

# 4. Firestore ルール・インデックスのデプロイ
cd ..
firebase deploy --only firestore:rules,firestore:indexes,storage --project your-project-staging
```

### GitHub Actions 経由のデプロイ

develop ブランチへのプッシュで自動デプロイ:

```bash
git checkout develop
git merge your-feature-branch
git push origin develop
```

または、手動トリガー:

1. GitHub リポジトリへ移動
2. Actions タブを選択
3. "Deploy" ワークフローを選択
4. "Run workflow" → "staging" を選択

---

## プロダクション環境へのデプロイ

### デプロイ前チェックリスト

- [ ] すべてのテストがパス
- [ ] ステージング環境で動作確認済み
- [ ] 環境変数が正しく設定されている
- [ ] データベースバックアップ取得済み
- [ ] ロールバック手順の確認

### 手動デプロイ

```bash
# 1. テストの実行
npm test

# 2. ビルド
VITE_ENVIRONMENT=production npm run build

# 3. Firebase Hosting へデプロイ
firebase deploy --only hosting --project your-project-production

# 4. Cloud Functions へデプロイ
cd functions
npm run build
firebase deploy --only functions --project your-project-production

# 5. Firestore ルール・インデックスのデプロイ
cd ..
firebase deploy --only firestore:rules,firestore:indexes,storage --project your-project-production
```

### GitHub Actions 経由のデプロイ

main ブランチへのプッシュで自動デプロイ:

```bash
git checkout main
git merge develop
git push origin main
```

### デプロイ後の確認

1. アプリケーションの動作確認: `https://your-project.web.app`
2. Cloud Functions のログ確認:
   ```bash
   firebase functions:log --project your-project-production
   ```
3. Firestore のデータ確認
4. エラーレポート（Sentry）の確認

---

## CI/CD

### GitHub Secrets の設定

GitHub リポジトリの Settings → Secrets and variables → Actions で以下を設定:

#### ステージング環境

- `STAGING_FIREBASE_API_KEY`
- `STAGING_FIREBASE_AUTH_DOMAIN`
- `STAGING_FIREBASE_PROJECT_ID`
- `STAGING_FIREBASE_STORAGE_BUCKET`
- `STAGING_FIREBASE_MESSAGING_SENDER_ID`
- `STAGING_FIREBASE_APP_ID`
- `STAGING_FIREBASE_SERVICE_ACCOUNT`
- `STAGING_ANTHROPIC_API_KEY`
- `STAGING_VOYAGE_API_KEY`
- `FIREBASE_TOKEN`

#### プロダクション環境

- `PROD_FIREBASE_API_KEY`
- `PROD_FIREBASE_AUTH_DOMAIN`
- `PROD_FIREBASE_PROJECT_ID`
- `PROD_FIREBASE_STORAGE_BUCKET`
- `PROD_FIREBASE_MESSAGING_SENDER_ID`
- `PROD_FIREBASE_APP_ID`
- `PROD_FIREBASE_SERVICE_ACCOUNT`
- `PROD_ANTHROPIC_API_KEY`
- `PROD_VOYAGE_API_KEY`
- `PROD_SENTRY_DSN`

### ワークフロー

#### CI ワークフロー (.github/workflows/ci.yml)

- トリガー: すべてのブランチへのpush/PR
- 処理:
  1. TypeScript 型チェック
  2. テスト実行
  3. カバレッジレポート生成
  4. ビルド

#### デプロイワークフロー (.github/workflows/deploy.yml)

- トリガー:
  - develop ブランチへのpush → ステージング環境
  - main ブランチへのpush → プロダクション環境
  - 手動トリガー
- 処理:
  1. テスト実行（プロダクションのみ）
  2. ビルド
  3. Firebase Hosting デプロイ
  4. Cloud Functions デプロイ
  5. Firestore ルール・インデックスデプロイ

---

## トラブルシューティング

### デプロイが失敗する

#### 問題: 環境変数が見つからない

```
Error: Missing environment variable: VITE_FIREBASE_API_KEY
```

**解決策**:
```bash
# 環境変数ファイルを確認
cat .env.production

# GitHub Secrets を確認
# Settings → Secrets and variables → Actions
```

#### 問題: Firebase 認証エラー

```
Error: Authentication Error: Your credentials are no longer valid
```

**解決策**:
```bash
# Firebase に再ログイン
firebase logout
firebase login

# トークンの再生成
firebase login:ci
```

### Cloud Functions が動作しない

#### 問題: 関数が見つからない

```
Error: Function not found
```

**解決策**:
```bash
# 関数のデプロイ状況を確認
firebase functions:list --project your-project-id

# 関数を再デプロイ
cd functions
npm run build
firebase deploy --only functions --project your-project-id
```

#### 問題: 権限エラー

```
Error: Permission denied
```

**解決策**:
- Firebase Console でサービスアカウントの権限を確認
- IAM で必要な権限を付与:
  - Cloud Functions Developer
  - Firebase Admin
  - Cloud Datastore User

### ビルドエラー

#### 問題: TypeScript エラー

```
Error: Type 'X' is not assignable to type 'Y'
```

**解決策**:
```bash
# 型チェック
npx tsc --noEmit

# node_modules を再インストール
rm -rf node_modules package-lock.json
npm install
```

### パフォーマンス問題

#### Cloud Functions が遅い

**解決策**:
1. メモリ割り当てを増やす:
   ```typescript
   export const myFunction = functions
     .runWith({ memory: '2GB' })
     .https.onCall(...)
   ```

2. タイムアウトを調整:
   ```typescript
   export const myFunction = functions
     .runWith({ timeoutSeconds: 300 })
     .https.onCall(...)
   ```

3. コールドスタートを減らす:
   - Min instances を設定
   - Keep-alive ping を実装

---

## ロールバック手順

### Firebase Hosting のロールバック

```bash
# 以前のデプロイバージョンを確認
firebase hosting:channel:list --project your-project-id

# ロールバック
firebase hosting:rollback --project your-project-id
```

### Cloud Functions のロールバック

```bash
# 以前のバージョンをデプロイ
git checkout <previous-commit>
cd functions
npm run build
firebase deploy --only functions --project your-project-id
```

---

## モニタリング

### ログの確認

```bash
# Cloud Functions ログ
firebase functions:log --project your-project-id

# 特定の関数のログ
firebase functions:log --only myFunction --project your-project-id

# リアルタイムログ
firebase functions:log --project your-project-id --tail
```

### パフォーマンス監視

- Firebase Console → Performance
- Cloud Functions → Metrics
- Firestore → Usage

### エラー監視

- Sentry Dashboard
- Firebase Console → Crashlytics
- Cloud Logging

---

## セキュリティ

### 定期的なセキュリティチェック

```bash
# 依存関係の脆弱性チェック
npm audit

# 修正
npm audit fix
```

### Firestore ルールのテスト

```bash
# エミュレータでテスト
firebase emulators:start --only firestore
npm run test:security-rules
```

---

## サポート

問題が解決しない場合:

1. このドキュメントを再確認
2. GitHub Issues を検索
3. Firebase サポートに問い合わせ
4. チームメンバーに相談

---

**最終更新日**: 2025年11月16日
