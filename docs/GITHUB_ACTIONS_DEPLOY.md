# GitHub Actions を使った Firebase デプロイ手順

このガイドでは、GitHub Actions を使って Firestore Indexes と Cloud Functions をデプロイする方法を説明します。

## 🚀 クイックスタート

### 1. GitHub Secrets の設定

デプロイには Firebase のサービスアカウントキーが必要です。

#### 手順:

1. **Firebase サービスアカウントキーを取得**

   ```bash
   # Google Cloud Console で実行
   # https://console.cloud.google.com/iam-admin/serviceaccounts

   # または gcloud CLI で実行
   gcloud iam service-accounts keys create firebase-key.json \
     --iam-account=<SERVICE_ACCOUNT_EMAIL>
   ```

2. **GitHub Secrets に追加**

   - GitHub リポジトリのページを開く
   - `Settings` → `Secrets and variables` → `Actions` をクリック
   - `New repository secret` をクリック
   - Secret を追加:
     - Name: `FIREBASE_SERVICE_ACCOUNT`
     - Value: `firebase-key.json` の内容をコピー＆ペースト

### 2. デプロイの実行

GitHub Actions のワークフローを手動で実行します。

#### 手順:

1. **GitHub リポジトリのページを開く**

2. **Actions タブをクリック**
   - https://github.com/<your-username>/<your-repo>/actions

3. **"Deploy Firestore Indexes and Cloud Functions" ワークフローを選択**

4. **"Run workflow" ボタンをクリック**

5. **デプロイオプションを選択:**
   - **Target**: デプロイ対象を選択
     - `all`: Firestore Indexes と Cloud Functions の両方
     - `firestore-indexes`: Firestore Indexes のみ
     - `functions`: Cloud Functions のみ
   - **Project ID**: Firebase プロジェクト ID を入力（例: `my-project-123`）

6. **"Run workflow" をクリックして実行**

7. **進捗を確認**
   - ワークフローの実行が開始されます
   - リアルタイムでログを確認できます
   - 完了まで数分かかります

---

## 📋 デプロイ対象の詳細

### オプション 1: すべてデプロイ（推奨）

```
Target: all
```

以下を順番にデプロイします：
1. ✅ Firestore Indexes（8個）
2. ✅ Cloud Functions（テスト実行後）
   - processChat
   - processFileUpload
   - vectorSearch
   - scheduledHealthCheck
   - その他すべての関数

**推奨シナリオ:** 初回デプロイ、大きな変更後

### オプション 2: Firestore Indexes のみ

```
Target: firestore-indexes
```

Firestore のインデックスのみをデプロイします。

**デプロイ内容:**
- error_logs インデックス（service + timestamp）
- healthChecks インデックス（timestamp）
- alerts インデックス（acknowledged + timestamp）
- その他 Phase 4 インデックス

**推奨シナリオ:** インデックス定義のみを変更した場合

### オプション 3: Cloud Functions のみ

```
Target: functions
```

Cloud Functions のみをデプロイします。

**デプロイ前に自動実行:**
1. 依存関係のインストール（`npm ci`）
2. TypeScript ビルド（`npm run build`）
3. ユニットテスト（`npm test`）

**推奨シナリオ:** 関数のコードのみを変更した場合

---

## ⏱️ デプロイ時間の目安

| 対象 | 所要時間 |
|------|---------|
| Firestore Indexes のみ | 1-2分 |
| Cloud Functions のみ | 5-10分 |
| すべて（all） | 7-12分 |

**注意:** Firestore Indexes の作成は、デプロイコマンド完了後も Firebase 側で数分〜数十分かかる場合があります。

---

## 🔍 デプロイ後の確認

### 1. GitHub Actions ログを確認

デプロイが成功したか、ログで確認します：

```
✅ Deployment to Firebase successful!
Target: all
Project: your-project-id
```

### 2. Firebase Console で確認

#### Firestore Indexes:
- https://console.firebase.google.com/project/<your-project>/firestore/indexes
- 8個のインデックスが「作成中」または「有効」になっているか確認

#### Cloud Functions:
- https://console.firebase.google.com/project/<your-project>/functions
- 関数が正常にデプロイされているか確認
- ヘルスチェックのログを確認:
  ```bash
  firebase functions:log --only scheduledHealthCheck
  ```

### 3. アプリケーションをテスト

- フロントエンドからチャット機能をテスト
- ドキュメントアップロード機能をテスト
- エラーが発生していないか確認

---

## ⚠️ トラブルシューティング

### エラー: Permission denied (403)

**原因:** サービスアカウントに必要な権限がない

**解決方法:**
1. [FIREBASE_PERMISSION_FIX_JP.md](./FIREBASE_PERMISSION_FIX_JP.md) を参照
2. 以下のロールを追加:
   - Service Usage Consumer ← **最重要**
   - Firebase Admin
   - Cloud Functions Developer
   - Cloud Datastore Index Admin
   - Cloud Scheduler Admin
3. 1〜2分待ってから再実行

### エラー: Tests failed

**原因:** ユニットテストが失敗した

**解決方法:**
1. ローカルでテストを実行:
   ```bash
   cd functions
   npm test
   ```
2. 失敗したテストを修正
3. コミット＆プッシュ
4. GitHub Actions を再実行

### エラー: Build failed

**原因:** TypeScript のビルドエラー

**解決方法:**
1. ローカルでビルドを実行:
   ```bash
   cd functions
   npm run build
   ```
2. エラーを修正
3. コミット＆プッシュ
4. GitHub Actions を再実行

### エラー: FIREBASE_SERVICE_ACCOUNT secret not found

**原因:** GitHub Secrets が設定されていない

**解決方法:**
1. GitHub リポジトリの Settings → Secrets → Actions
2. `FIREBASE_SERVICE_ACCOUNT` を追加
3. サービスアカウントキー（JSON）を貼り付け

---

## 🔐 セキュリティのベストプラクティス

### 1. サービスアカウントの権限を最小限に

必要な権限のみを付与してください：

```bash
# 必須権限のみ
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/serviceusage.serviceUsageConsumer"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/firebase.admin"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudfunctions.developer"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/datastore.indexAdmin"
```

### 2. サービスアカウントキーをローテーション

定期的に（3〜6ヶ月ごと）サービスアカウントキーを更新してください：

```bash
# 古いキーを削除
gcloud iam service-accounts keys delete <KEY_ID> \
  --iam-account=<SERVICE_ACCOUNT_EMAIL>

# 新しいキーを作成
gcloud iam service-accounts keys create firebase-key.json \
  --iam-account=<SERVICE_ACCOUNT_EMAIL>

# GitHub Secrets を更新
```

### 3. デプロイログを監視

不正なデプロイがないか、定期的にログを確認してください：

- GitHub Actions の実行履歴
- Firebase Console のアクティビティログ
- Cloud Functions のデプロイ履歴

---

## 📊 コスト監視

デプロイ後は、コスト監視を忘れずに：

1. **予算アラートの設定**
   - [COST_ESTIMATION.md](./COST_ESTIMATION.md) を参照
   - Firebase Console で予算を設定

2. **コストダッシュボードの確認**
   - Firestore の `cost_tracking` コレクション
   - 日次レポートを確認

3. **アラート機能の活用**
   - 1時間ごとの予算チェック
   - メール通知の設定

---

## 🎯 まとめ

GitHub Actions を使ったデプロイの流れ：

1. ✅ GitHub Secrets に `FIREBASE_SERVICE_ACCOUNT` を設定
2. ✅ Firebase サービスアカウントに必要な権限を付与
3. ✅ GitHub Actions で "Deploy Firestore Indexes and Cloud Functions" を実行
4. ✅ デプロイ完了を確認
5. ✅ Firebase Console と実際のアプリで動作確認

**初回デプロイの推奨設定:**
- Target: `all`（Firestore Indexes + Cloud Functions）
- Project ID: あなたの Firebase プロジェクト ID

**次回以降のデプロイ:**
- 変更内容に応じて `firestore-indexes` または `functions` を選択

問題が発生した場合は、このドキュメントのトラブルシューティングセクションを参照してください。
