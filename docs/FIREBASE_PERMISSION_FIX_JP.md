# Firebase デプロイエラー 403 の解決方法

## エラー内容

```
Error: Request to https://serviceusage.googleapis.com/v1/projects/***/services/firestore.googleapis.com
had HTTP Error: 403, Permission denied to get service [firestore.googleapis.com]
```

## 原因

Firebase CLI がデプロイ時に API の有効化状態を確認しようとしていますが、使用しているサービスアカウントに **Service Usage Consumer** (`roles/serviceusage.serviceUsageConsumer`) ロールが付与されていないため、権限エラーが発生しています。

## 解決方法（2つの方法から選択）

### 方法1: Google Cloud Console を使用（GUI操作）

1. **Google Cloud Console にアクセス**
   - https://console.cloud.google.com/iam-admin/iam にアクセス
   - 対象のプロジェクトを選択

2. **サービスアカウントを見つける**
   - サービスアカウントのリストから、デプロイに使用しているアカウントを探します
   - 例: `github-actions@PROJECT_ID.iam.gserviceaccount.com`
   - または `PROJECT_ID@appspot.gserviceaccount.com`

3. **ロールを追加**
   - サービスアカウントの右側にある「編集」ボタン（鉛筆アイコン）をクリック
   - 「別のロールを追加」をクリック
   - 以下のロールを追加:
     * **Service Usage Consumer** (`roles/serviceusage.serviceUsageConsumer`) ← **これが必須**
     * Firebase Admin (`roles/firebase.admin`)
     * Cloud Functions Developer (`roles/cloudfunctions.developer`)
     * Cloud Datastore Index Admin (`roles/datastore.indexAdmin`)

4. **保存**
   - 「保存」ボタンをクリック

### 方法2: gcloud CLI を使用（コマンドライン）

ターミナルで以下のコマンドを実行してください：

```bash
# 1. プロジェクト ID を設定（自分のプロジェクト ID に置き換えてください）
PROJECT_ID="your-project-id"

# 2. サービスアカウントのメールアドレスを確認
# GitHub Actions の場合:
SERVICE_ACCOUNT="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"
# または App Engine デフォルトの場合:
# SERVICE_ACCOUNT="${PROJECT_ID}@appspot.gserviceaccount.com"

# 3. Service Usage Consumer ロールを追加（エラー解決に必須）
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/serviceusage.serviceUsageConsumer"

# 4. Firebase Admin ロールを追加（まだ付与されていない場合）
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/firebase.admin"

# 5. Cloud Functions Developer ロールを追加
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudfunctions.developer"

# 6. Cloud Datastore Index Admin ロールを追加
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/datastore.indexAdmin"

# 7. 設定を確認
gcloud projects get-iam-policy ${PROJECT_ID} \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${SERVICE_ACCOUNT}"
```

## 実行例

```bash
# 例: プロジェクト ID が "my-firebase-project" の場合

PROJECT_ID="my-firebase-project"
SERVICE_ACCOUNT="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

# 必須ロールを追加
gcloud projects add-iam-policy-binding my-firebase-project \
  --member="serviceAccount:github-actions@my-firebase-project.iam.gserviceaccount.com" \
  --role="roles/serviceusage.serviceUsageConsumer"
```

## 設定後の確認

権限を追加した後、以下を実行してデプロイを再試行してください：

```bash
# Firestore インデックスをデプロイ
firebase deploy --only firestore:indexes

# Cloud Functions をデプロイ
firebase deploy --only functions
```

## トラブルシューティング

### エラーが解消されない場合

1. **権限の反映に時間がかかる場合があります**
   - 設定後、1〜2分待ってから再試行してください

2. **正しいサービスアカウントを選択したか確認**
   ```bash
   # サービスアカウントのリストを表示
   gcloud iam service-accounts list
   ```

3. **gcloud CLI が正しいプロジェクトに接続されているか確認**
   ```bash
   # 現在のプロジェクトを確認
   gcloud config get-value project

   # プロジェクトを切り替える
   gcloud config set project YOUR_PROJECT_ID
   ```

4. **自分のアカウントに IAM 管理権限があるか確認**
   - プロジェクトの Owner または IAM Admin ロールが必要です

### GitHub Actions で実行している場合

GitHub Actions のワークフローファイルで、正しいサービスアカウントキーが設定されているか確認してください：

```yaml
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v1
  with:
    credentials_json: ${{ secrets.GCP_SA_KEY }}
```

## 参考資料

詳細な権限の説明については、以下のドキュメントを参照してください：
- [FIREBASE_CI_PERMISSIONS.md](./FIREBASE_CI_PERMISSIONS.md) - 全ての必要な権限の詳細
- [Firebase CLI リファレンス](https://firebase.google.com/docs/cli)
- [Google Cloud IAM ロール](https://cloud.google.com/iam/docs/understanding-roles)

## まとめ

最も重要なのは **Service Usage Consumer** (`roles/serviceusage.serviceUsageConsumer`) ロールを追加することです。このロールがないと、Firebase CLI が API の有効化状態を確認できず、デプロイが失敗します。

上記の手順を実行した後、デプロイを再試行してください。
