# 環境変数管理ガイド

**作成日**: 2025年11月22日
**対象**: ET-AI プロジェクト全体
**担当**: DevOpsエンジニア

---

## 概要

このガイドでは、ET-AIプロジェクトで使用される環境変数の管理方法を説明します。
フロントエンド（Vite）とバックエンド（Firebase Functions）で異なる設定方法を使用します。

---

## 環境変数の分類

### 1. フロントエンド環境変数（`.env`）

**場所**: プロジェクトルート（`/`）
**形式**: `.env.local`, `.env.staging`, `.env.production`
**ビルドツール**: Vite

### 2. バックエンド環境変数（Firebase Functions Config）

**場所**: Firebase Functions（`/functions`）
**形式**: `firebase functions:config:set`
**ランタイム**: Cloud Functions

---

## フロントエンド環境変数

### 変数一覧

| 変数名 | 説明 | 必須 | 例 |
|--------|------|------|-----|
| `VITE_ENVIRONMENT` | 実行環境 | Yes | `development`, `staging`, `production` |
| `VITE_FIREBASE_API_KEY` | Firebase API Key | Yes | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | Yes | `et-ai-staging.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | Yes | `et-ai-staging` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket | Yes | `et-ai-staging.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID | Yes | `1234567890` |
| `VITE_FIREBASE_APP_ID` | Firebase App ID | Yes | `1:1234567890:web:abcdef` |
| `VITE_SENTRY_DSN` | Sentry DSN（エラー監視） | No | `https://...@sentry.io/...` |

### セットアップ手順

#### 1. テンプレートをコピー

```bash
# 開発環境
cp .env.template .env.local

# ステージング環境
cp .env.template .env.staging

# 本番環境
cp .env.template .env.production
```

#### 2. 値を設定

`.env.local` を編集：

```bash
# Environment
VITE_ENVIRONMENT=development

# Firebase Configuration
VITE_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=et-ai-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=et-ai-dev
VITE_FIREBASE_STORAGE_BUCKET=et-ai-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef123456

# Optional: Sentry
VITE_SENTRY_DSN=https://...@sentry.io/...
```

#### 3. ビルド

```bash
# 開発環境
npm run dev

# ステージング環境
npm run build:staging

# 本番環境
npm run build:production
```

### GitHub Secretsの設定

CI/CDパイプライン用にGitHub Secretsを設定します。

#### Staging環境

| Secret名 | 説明 |
|----------|------|
| `STAGING_FIREBASE_API_KEY` | Firebase API Key |
| `STAGING_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `STAGING_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `STAGING_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket |
| `STAGING_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID |
| `STAGING_FIREBASE_APP_ID` | Firebase App ID |
| `STAGING_ANTHROPIC_API_KEY` | Anthropic Claude API Key（Functions用） |
| `STAGING_VOYAGE_API_KEY` | Voyage AI API Key（Functions用） |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Service Account JSON |

#### Production環境

| Secret名 | 説明 |
|----------|------|
| `PROD_FIREBASE_API_KEY` | Firebase API Key |
| `PROD_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `PROD_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `PROD_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket |
| `PROD_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID |
| `PROD_FIREBASE_APP_ID` | Firebase App ID |
| `PROD_ANTHROPIC_API_KEY` | Anthropic Claude API Key（Functions用） |
| `PROD_VOYAGE_API_KEY` | Voyage AI API Key（Functions用） |
| `PROD_SENTRY_DSN` | Sentry DSN（エラー監視） |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Service Account JSON |

---

## バックエンド環境変数（Firebase Functions）

### 変数一覧

| Config Key | 説明 | 必須 | 例 |
|------------|------|------|-----|
| `anthropic.api_key` | Anthropic Claude API Key | Yes | `sk-ant-...` |
| `voyage.api_key` | Voyage AI Embedding API Key | Yes | `pa-...` |
| `slack.webhook_url` | Slack Webhook URL（通知用） | No | `https://hooks.slack.com/...` |
| `sendgrid.api_key` | SendGrid API Key（メール通知用） | No | `SG....` |
| `admin.email` | 管理者メールアドレス | No | `admin@trias.co.jp` |

### セットアップ手順

#### 1. Staging環境

```bash
# Firebase Functions config を設定
firebase functions:config:set \
  anthropic.api_key="sk-ant-..." \
  voyage.api_key="pa-..." \
  slack.webhook_url="https://hooks.slack.com/services/..." \
  admin.email="admin@trias.co.jp" \
  --project=et-ai-staging
```

#### 2. Production環境

```bash
# Firebase Functions config を設定
firebase functions:config:set \
  anthropic.api_key="sk-ant-..." \
  voyage.api_key="pa-..." \
  slack.webhook_url="https://hooks.slack.com/services/..." \
  sendgrid.api_key="SG...." \
  admin.email="admin@trias.co.jp" \
  --project=et-ai-production
```

#### 3. 設定の確認

```bash
# 設定を表示
firebase functions:config:get --project=et-ai-staging

# 出力例:
# {
#   "anthropic": {
#     "api_key": "sk-ant-..."
#   },
#   "voyage": {
#     "api_key": "pa-..."
#   },
#   "slack": {
#     "webhook_url": "https://hooks.slack.com/..."
#   },
#   "admin": {
#     "email": "admin@trias.co.jp"
#   }
# }
```

#### 4. ローカル開発環境

ローカルでFunctionsをテストする場合、`.runtimeconfig.json`を作成します。

```bash
# functions ディレクトリで実行
cd functions
firebase functions:config:get > .runtimeconfig.json
```

**.gitignore に追加**:

```bash
# functions/.gitignore
.runtimeconfig.json
```

#### 5. コードでの使用方法

```typescript
// functions/src/services/notificationService.ts

import * as functions from 'firebase-functions';

// Firebase Functions config から取得
const slackWebhookUrl = functions.config().slack?.webhook_url;
const anthropicApiKey = functions.config().anthropic?.api_key;
const voyageApiKey = functions.config().voyage?.api_key;

// 環境変数が設定されていない場合のフォールバック
if (!anthropicApiKey) {
  throw new Error('anthropic.api_key is not configured');
}
```

---

## API キーの取得方法

### Anthropic Claude API Key

1. [Anthropic Console](https://console.anthropic.com/) にアクセス
2. 「API Keys」→「Create Key」
3. キーをコピーして保存

**価格**: 従量課金（Claude 3.5 Sonnet: $3/MTok入力, $15/MTok出力）

### Voyage AI API Key

1. [Voyage AI](https://www.voyageai.com/) にサインアップ
2. ダッシュボードで「API Keys」→「Create New Key」
3. キーをコピーして保存

**価格**: 従量課金（voyage-large-2: $0.12/1M tokens）

### Slack Webhook URL

1. Slackワークスペースで [Incoming Webhooks App](https://api.slack.com/messaging/webhooks) を有効化
2. 通知先チャンネルを選択（例: `#et-ai-notifications`）
3. Webhook URLをコピー

**価格**: 無料

### SendGrid API Key（オプション）

1. [SendGrid](https://sendgrid.com/) にサインアップ
2. 「Settings」→「API Keys」→「Create API Key」
3. 権限を「Full Access」に設定
4. キーをコピーして保存

**価格**: 無料プラン（100通/日）あり

---

## セキュリティベストプラクティス

### 1. 秘密情報をGitにコミットしない

**.gitignore**:

```bash
# Environment files
.env
.env.local
.env.staging
.env.production

# Firebase Functions runtime config
functions/.runtimeconfig.json
```

### 2. API キーのローテーション

- **定期的なローテーション**: 3-6ヶ月ごとにAPI キーを更新
- **漏洩時の対応**: 即座に無効化して新しいキーを発行

### 3. 最小権限の原則

- Firebase Service Account には必要最小限の権限のみを付与
- API キーには適切なスコープを設定

### 4. モニタリング

- API使用量を定期的に確認
- 異常なアクセスがないか監視

---

## トラブルシューティング

### エラー: "Config key not found"

**原因**: Firebase Functions config が設定されていない。

**解決方法**:

```bash
# 設定を確認
firebase functions:config:get --project=<PROJECT_ID>

# 設定を追加
firebase functions:config:set anthropic.api_key="..." --project=<PROJECT_ID>

# 再デプロイ
firebase deploy --only functions --project=<PROJECT_ID>
```

### エラー: "VITE_XXX is not defined"

**原因**: `.env` ファイルが読み込まれていない。

**解決方法**:

```bash
# .env.local が存在するか確認
ls -la .env.local

# Viteを再起動
npm run dev
```

### ローカルで Functions が動かない

**原因**: `.runtimeconfig.json` が存在しない。

**解決方法**:

```bash
cd functions
firebase functions:config:get > .runtimeconfig.json
```

---

## 環境変数の更新手順

### フロントエンド環境変数の更新

1. `.env.staging` または `.env.production` を編集
2. GitHub Secrets を更新（GitHub UI または gh CLI）
3. 再デプロイ

```bash
# GitHub Secrets の更新（gh CLI）
gh secret set STAGING_FIREBASE_API_KEY --body "new_api_key_value"
```

### バックエンド環境変数の更新

```bash
# Firebase Functions config を更新
firebase functions:config:set anthropic.api_key="new_key" --project=<PROJECT_ID>

# 再デプロイ（設定変更は自動的に反映されない）
firebase deploy --only functions --project=<PROJECT_ID>
```

---

## 参考リンク

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Firebase Functions Configuration](https://firebase.google.com/docs/functions/config-env)
- [Anthropic API Documentation](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Voyage AI Documentation](https://docs.voyageai.com/)
- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)

---

**作成者**: DevOpsエンジニア
**最終更新**: 2025年11月22日
