# Firebase CI/CD Deployment - Required Permissions

このドキュメントでは、CI/CDパイプラインからFirebaseにデプロイする際に必要なサービスアカウントの権限を説明します。

## エラーの原因

```
Error: Request to https://serviceusage.googleapis.com/v1/projects/***/services/firestore.googleapis.com had HTTP Error: 403, Permission denied to get service [firestore.googleapis.com]
```

このエラーは、サービスアカウントがFirestore APIの有効化状態を確認する権限を持っていないために発生します。

## 必要な権限

### 1. 基本的な Firebase デプロイ権限

サービスアカウントに以下のロールを付与してください：

| ロール | 説明 | 必要な理由 |
|-------|------|-----------|
| `roles/firebase.admin` | Firebase Admin | Firebase リソースへのフルアクセス |
| `roles/iam.serviceAccountUser` | Service Account User | サービスアカウントとして実行 |

### 2. Cloud Functions デプロイ権限

| ロール | 説明 |
|-------|------|
| `roles/cloudfunctions.developer` | Cloud Functions Developer |
| `roles/cloudscheduler.admin` | Cloud Scheduler Admin |
| `roles/iam.serviceAccountUser` | Service Account User |

### 3. Firestore デプロイ権限

| ロール | 説明 |
|-------|------|
| `roles/datastore.indexAdmin` | Cloud Datastore Index Admin |
| `roles/datastore.owner` | Cloud Datastore Owner |
| `roles/serviceusage.serviceUsageConsumer` | **Service Usage Consumer** ← このエラーの原因 |

### 4. その他の推奨権限

| ロール | 説明 | 必要性 |
|-------|------|--------|
| `roles/storage.admin` | Storage Admin | Firebase Storage デプロイ |
| `roles/cloudkms.admin` | Cloud KMS Admin | シークレット管理 |
| `roles/logging.logWriter` | Logs Writer | ログ出力 |

## 権限の設定方法

### Google Cloud Console から設定

1. [IAM & Admin](https://console.cloud.google.com/iam-admin/iam) を開く
2. サービスアカウントを見つける（例: `github-actions@PROJECT_ID.iam.gserviceaccount.com`）
3. 「編集」をクリック
4. 「別のロールを追加」をクリック
5. 必要なロールを追加：
   - Firebase Admin (`roles/firebase.admin`)
   - Service Usage Consumer (`roles/serviceusage.serviceUsageConsumer`)
   - Cloud Functions Developer (`roles/cloudfunctions.developer`)
   - Cloud Scheduler Admin (`roles/cloudscheduler.admin`)
   - Cloud Datastore Index Admin (`roles/datastore.indexAdmin`)
6. 「保存」をクリック

### gcloud CLI から設定

```bash
# プロジェクト ID とサービスアカウント
PROJECT_ID="your-project-id"
SERVICE_ACCOUNT="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

# Firebase Admin
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/firebase.admin"

# Service Usage Consumer (エラー解決に必要)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/serviceusage.serviceUsageConsumer"

# Cloud Functions Developer
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudfunctions.developer"

# Cloud Scheduler Admin
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudscheduler.admin"

# Datastore Index Admin
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/datastore.indexAdmin"

# Service Account User
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/iam.serviceAccountUser"
```

### カスタムロールの作成（最小権限の原則）

より細かい権限制御が必要な場合、カスタムロールを作成できます：

```bash
gcloud iam roles create FirebaseCI \
  --project=${PROJECT_ID} \
  --title="Firebase CI/CD Deployer" \
  --description="Custom role for Firebase CI/CD deployments" \
  --permissions=\
cloudfunctions.functions.create,\
cloudfunctions.functions.delete,\
cloudfunctions.functions.get,\
cloudfunctions.functions.list,\
cloudfunctions.functions.sourceCodeSet,\
cloudfunctions.functions.update,\
cloudfunctions.operations.get,\
cloudfunctions.operations.list,\
cloudscheduler.jobs.create,\
cloudscheduler.jobs.delete,\
cloudscheduler.jobs.enable,\
cloudscheduler.jobs.get,\
cloudscheduler.jobs.list,\
cloudscheduler.jobs.run,\
cloudscheduler.jobs.update,\
datastore.indexes.create,\
datastore.indexes.delete,\
datastore.indexes.get,\
datastore.indexes.list,\
datastore.indexes.update,\
firebase.projects.get,\
firebase.projects.update,\
iam.serviceAccounts.actAs,\
resourcemanager.projects.get,\
serviceusage.services.get,\
serviceusage.services.list
```

## GitHub Actions での設定

### サービスアカウントキーの作成

```bash
# サービスアカウントキーを作成
gcloud iam service-accounts keys create ~/firebase-service-account.json \
  --iam-account=${SERVICE_ACCOUNT}

# JSON の内容を base64 エンコード
cat ~/firebase-service-account.json | base64 > ~/firebase-key-base64.txt
```

### GitHub Secrets の設定

1. GitHub リポジトリの Settings > Secrets and variables > Actions
2. 「New repository secret」をクリック
3. 名前: `FIREBASE_SERVICE_ACCOUNT`
4. 値: `firebase-key-base64.txt` の内容をペースト
5. 「Add secret」をクリック

### Workflow での使用

```yaml
- name: Setup Firebase credentials
  run: |
    echo "${{ secrets.FIREBASE_SERVICE_ACCOUNT }}" | base64 -d > $HOME/firebase-service-account.json
    export GOOGLE_APPLICATION_CREDENTIALS="$HOME/firebase-service-account.json"
    
- name: Deploy to Firebase
  run: |
    firebase deploy --only firestore:indexes,functions
```

## トラブルシューティング

### エラー: Permission denied to get service

**原因：** `roles/serviceusage.serviceUsageConsumer` ロールが不足

**解決方法：**
```bash
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/serviceusage.serviceUsageConsumer"
```

### エラー: Missing permissions on Cloud Scheduler

**原因：** `roles/cloudscheduler.admin` ロールが不足

**解決方法：**
```bash
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudscheduler.admin"
```

### エラー: Cannot deploy Cloud Functions

**原因：** `roles/cloudfunctions.developer` または `roles/iam.serviceAccountUser` が不足

**解決方法：**
```bash
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudfunctions.developer"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/iam.serviceAccountUser"
```

### 権限の確認

現在のサービスアカウントの権限を確認：

```bash
gcloud projects get-iam-policy ${PROJECT_ID} \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${SERVICE_ACCOUNT}" \
  --format="table(bindings.role)"
```

## セキュリティのベストプラクティス

1. **最小権限の原則**
   - 必要最小限の権限のみを付与
   - カスタムロールの使用を検討

2. **サービスアカウントキーの管理**
   - GitHub Secrets で安全に保管
   - 定期的なローテーション（90日ごと）
   - 不要になったキーは即座に削除

3. **監査ログの有効化**
   - Cloud Logging で IAM 変更を追跡
   - 異常なアクセスパターンの監視

4. **環境の分離**
   - 開発・ステージング・本番で異なるサービスアカウントを使用
   - 環境ごとに権限を制限

## 参考リンク

- [Firebase CLI リファレンス](https://firebase.google.com/docs/cli)
- [Cloud Functions デプロイ](https://firebase.google.com/docs/functions/get-started)
- [IAM ロール一覧](https://cloud.google.com/iam/docs/understanding-roles)
- [サービスアカウントのベストプラクティス](https://cloud.google.com/iam/docs/best-practices-service-accounts)

---

**最終更新**: 2025-11-21  
**バージョン**: 1.0.0
