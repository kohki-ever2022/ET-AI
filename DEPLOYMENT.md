# ET-AI Firebase デプロイガイド

## 前提条件

1. **Node.js 20.x** がインストールされていること
2. **Firebase CLI** がインストールされていること
3. **Firebase プロジェクト** が作成されていること

## 初回セットアップ

### 1. Firebase CLI をインストール

```bash
npm install -g firebase-tools
```

### 2. Firebase にログイン

```bash
firebase login
```

ブラウザが開くので、Google アカウントでログインします。

### 3. Firebase プロジェクトを初期化（既に firebase.json がある場合はスキップ）

```bash
firebase init
```

以下を選択：
- ✅ Hosting
- ✅ Functions
- ✅ Firestore
- ✅ Storage

### 4. プロジェクトを選択

Firebase コンソールで作成したプロジェクトを選択します。

## デプロイ手順

### ステップ1: ビルド

```bash
# メインアプリをビルド
npm run build

# Firebase Functions をビルド
cd functions
npm run build
cd ..
```

### ステップ2: デプロイ

**すべてデプロイ（初回）:**
```bash
firebase deploy
```

**Hosting のみデプロイ:**
```bash
firebase deploy --only hosting
```

**Functions のみデプロイ:**
```bash
firebase deploy --only functions
```

**Firestore ルール＆インデックスをデプロイ:**
```bash
firebase deploy --only firestore
```

## プレビュー方法

### A. プレビューチャンネル（推奨）

PR レビュー用の一時的な URL を作成：

```bash
# ビルド
npm run build

# プレビューチャンネルを作成（7日間有効）
firebase hosting:channel:deploy preview-$(date +%Y%m%d-%H%M%S) --expires 7d
```

実行すると、以下のような URL が表示されます：
```
✔ Channel URL: https://your-project--preview-20251117-123456-abc123.web.app
```

### B. 本番デプロイ

```bash
npm run build
firebase deploy --only hosting
```

本番 URL:
```
https://your-project.web.app
https://your-project.firebaseapp.com
```

## 環境変数の設定

### 1. フロントエンド環境変数

`.env.production` ファイルを作成：

```bash
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_ANTHROPIC_API_KEY=your-anthropic-api-key
VITE_VOYAGE_API_KEY=your-voyage-api-key
```

### 2. Firebase Functions 環境変数

```bash
firebase functions:config:set anthropic.api_key="your-anthropic-key"
firebase functions:config:set voyage.api_key="your-voyage-key"
```

確認：
```bash
firebase functions:config:get
```

## GitHub Actions 自動デプロイ

### 必要なシークレット

GitHub リポジトリの Settings → Secrets に以下を追加：

1. **FIREBASE_TOKEN**
   ```bash
   # ローカルで実行してトークンを取得
   firebase login:ci
   ```
   
2. **PROD_FIREBASE_SERVICE_ACCOUNT**
   - Firebase Console → Project Settings → Service Accounts
   - "Generate new private key" をクリック
   - ダウンロードした JSON の内容全体をコピー

3. **環境変数**
   - `PROD_FIREBASE_API_KEY`
   - `PROD_FIREBASE_PROJECT_ID`
   - `PROD_ANTHROPIC_API_KEY`
   - `PROD_VOYAGE_API_KEY`
   など

### 自動デプロイのトリガー

`main` ブランチにマージすると自動的にデプロイされます：

```bash
git checkout main
git merge your-branch
git push origin main
```

## トラブルシューティング

### デプロイが失敗する場合

1. **ビルドエラー**
   ```bash
   npm run build
   # エラーを確認して修正
   ```

2. **Functions のエラー**
   ```bash
   cd functions
   npm run build
   npm run lint
   ```

3. **権限エラー**
   ```bash
   firebase login --reauth
   ```

4. **ログを確認**
   ```bash
   firebase functions:log
   ```

## ローカルテスト

デプロイ前にローカルでテスト：

```bash
# Firebase Emulator を起動
firebase emulators:start

# 別のターミナルで Vite dev server を起動
npm run dev
```

ブラウザで http://localhost:5173 を開く

## 参考リンク

- [Firebase Hosting ドキュメント](https://firebase.google.com/docs/hosting)
- [Firebase Functions ドキュメント](https://firebase.google.com/docs/functions)
- [Firebase CLI リファレンス](https://firebase.google.com/docs/cli)
