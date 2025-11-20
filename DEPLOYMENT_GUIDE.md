# デプロイメントガイド

## 概要

このガイドでは、ET-AIプロジェクトのFirestoreインデックスと機能をデプロイする手順を説明します。

## 前提条件

- Node.js 18以上
- Firebase CLIがインストールされていること
- Firebaseプロジェクトへのアクセス権限
- 適切なサービスアカウントの認証情報

## 1. Firebase CLIのインストール

```bash
# グローバルにインストール
npm install -g firebase-tools

# バージョン確認
firebase --version
```

## 2. Firebaseへのログイン

```bash
# ブラウザでログイン
firebase login

# または、CI/CD環境の場合
firebase login:ci
```

## 3. Firebaseプロジェクトの設定

### プロジェクトの初期化（初回のみ）

```bash
cd /path/to/ET-AI

# Firebaseプロジェクトを選択
firebase use --add
```

プロジェクトIDを選択し、エイリアス（例: `default`, `production`）を設定します。

### 既存プロジェクトの確認

```bash
# 現在のプロジェクトを確認
firebase use

# プロジェクト一覧を表示
firebase projects:list
```

## 4. Firestoreインデックスのデプロイ

### 4.1 インデックスファイルの確認

`firestore.indexes.json` に以下のインデックスが含まれていることを確認:

- ✅ **fiscalYears** コレクション（2個）
- ✅ **periods** コレクション（2個）
- ✅ **chunks** コレクション（1個）
- ✅ **knowledge** コレクション（時系列フィルタ対応、3個）
- ✅ **channels** コレクション（時系列フィルタ対応、1個）

### 4.2 インデックスのデプロイ

```bash
# Firestoreインデックスのみをデプロイ
firebase deploy --only firestore:indexes

# 確認プロンプトでYesを選択
```

**実行結果例:**
```
=== Deploying to 'your-project-id'...

i  deploying firestore
i  firestore: checking firestore.indexes.json for updates...
✔  firestore: deployed indexes in firestore.indexes.json successfully
✔  Deploy complete!
```

### 4.3 デプロイの確認

1. Firebase Consoleにアクセス: https://console.firebase.google.com/
2. プロジェクトを選択
3. Firestore Database → インデックス
4. 以下のインデックスが作成されていることを確認:
   - `fiscalYears`: projectId + startDate (DESC)
   - `fiscalYears`: projectId + status + startDate (DESC)
   - `periods`: projectId + fiscalYearId + startDate
   - `periods`: projectId + fiscalYearId + periodType + periodNumber
   - `chunks`: chatId + chunkIndex
   - `knowledge`: projectId + fiscalYearId + periodId + createdAt (DESC)
   - `knowledge`: projectId + fiscalYearId + embedding (vector)
   - `knowledge`: projectId + fiscalYearId + periodId + embedding (vector)
   - `channels`: projectId + fiscalYearId + periodId + createdAt (DESC)

## 5. Firestoreルールのデプロイ（オプション）

```bash
# Firestoreルールのみをデプロイ
firebase deploy --only firestore:rules
```

## 6. Functions のデプロイ（オプション）

```bash
# Cloud Functionsをビルド
cd functions
npm run build

# デプロイ
cd ..
firebase deploy --only functions
```

## 7. 環境変数の設定

### 7.1 Firebase Admin SDK用の環境変数

```bash
# サービスアカウントキーをダウンロード
# Firebase Console → プロジェクト設定 → サービスアカウント → 新しい秘密鍵を生成

# 環境変数を設定（.env.local）
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

⚠️ **注意:** `.env.local` ファイルは `.gitignore` に追加してください。

### 7.2 環境変数の読み込み

```bash
# .env.local を作成
cat > .env.local <<EOF
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
EOF

# dotenv を使用してテストスクリプトを実行
npm install -D dotenv
npx tsx -r dotenv/config scripts/testLongFormChat.ts
```

## 8. テストの実行

### 8.1 ローカルシミュレーションテスト（Firebase接続不要）

```bash
# チャンク化ロジックのテスト
npx tsx scripts/testLongFormChatLocal.ts
```

**テスト内容:**
- チャンク化処理のベンチマーク
- 再結合テスト
- パフォーマンステスト（5,000 〜 100,000文字）
- 統合報告書シミュレーション

### 8.2 Firestore統合テスト（Firebase接続必要）

```bash
# 環境変数を設定してから実行
npx tsx -r dotenv/config scripts/testLongFormChat.ts
```

**テスト内容:**
- Firestoreへの保存テスト
- Firestoreからの読み取りテスト
- ストリーミング読み取りテスト
- チャンク統計情報の取得

## 9. トラブルシューティング

### 問題: `Permission denied` エラー

**原因:** Firebaseプロジェクトへのアクセス権限がない

**解決策:**
```bash
# 再ログイン
firebase logout
firebase login

# プロジェクトの権限を確認
firebase projects:list
```

### 問題: インデックスのデプロイに失敗

**原因:** `firestore.indexes.json` の構文エラー

**解決策:**
```bash
# JSONファイルの検証
cat firestore.indexes.json | jq .

# 構文エラーがある場合、修正してから再デプロイ
firebase deploy --only firestore:indexes
```

### 問題: テストスクリプトが環境変数を読み込まない

**原因:** `.env.local` ファイルが存在しないか、パスが間違っている

**解決策:**
```bash
# .env.local の存在確認
ls -la .env.local

# 環境変数を手動でエクスポート
export FIREBASE_PROJECT_ID=your-project-id
export FIREBASE_CLIENT_EMAIL=...
export FIREBASE_PRIVATE_KEY=...

# テスト実行
npx tsx scripts/testLongFormChat.ts
```

### 問題: インデックスの作成に時間がかかる

**原因:** 既存データが多い場合、インデックスの作成に時間がかかる

**対応:**
- Firebase Consoleでインデックスのステータスを確認
- 「作成中」と表示されている場合は、完了を待つ
- 大量データの場合、数分〜数時間かかることがある

## 10. 本番環境へのデプロイ

### 10.1 デプロイ前チェックリスト

- [ ] すべてのテストが成功している
- [ ] `firestore.indexes.json` が最新
- [ ] `firestore.rules` が適切に設定されている
- [ ] 環境変数が正しく設定されている
- [ ] バックアップが取得されている

### 10.2 段階的デプロイ

```bash
# 1. Firestoreインデックスのみをデプロイ（影響が少ない）
firebase deploy --only firestore:indexes

# 2. インデックスの作成完了を確認

# 3. Firestoreルールをデプロイ
firebase deploy --only firestore:rules

# 4. Cloud Functionsをデプロイ（必要な場合）
firebase deploy --only functions
```

### 10.3 デプロイ後の確認

1. **インデックスの確認**
   - Firebase Console → Firestore → インデックス
   - すべてのインデックスが「有効」になっていることを確認

2. **機能テスト**
   - 統合報告書の作成テスト
   - チャンネルの作成・検索テスト
   - ナレッジ検索テスト

3. **パフォーマンス確認**
   - Firebase Console → パフォーマンス
   - レスポンスタイムとエラー率を確認

## 11. CI/CDでの自動デプロイ

### GitHub Actions の例

```yaml
name: Deploy to Firebase

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npx tsx scripts/testLongFormChatLocal.ts

      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: your-project-id
          channelId: live
```

## 12. ロールバック

問題が発生した場合のロールバック手順:

```bash
# 以前のデプロイを確認
firebase deploy:history

# 特定のバージョンにロールバック
firebase rollback firestore:indexes <deployment-id>
```

## 参考資料

- [Firebase CLI リファレンス](https://firebase.google.com/docs/cli)
- [Firestore インデックス](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Firebase セキュリティルール](https://firebase.google.com/docs/firestore/security/get-started)
- [ET-AI 長文チャット処理ガイド](./LONG_FORM_CHAT_HANDLING.md)
- [ET-AI 時系列構造UI設計](./TIME_SERIES_UI_DESIGN.md)

## サポート

問題が解決しない場合:
1. [Firebase サポート](https://firebase.google.com/support)
2. [GitHub Issues](https://github.com/your-repo/ET-AI/issues)
3. プロジェクト開発チームに連絡
