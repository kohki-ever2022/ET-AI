# バッチ処理セットアップガイド

週次パターン抽出とナレッジメンテナンスのバッチ処理をセットアップするための完全ガイドです。

## 目次

1. [前提条件](#前提条件)
2. [Firestoreインデックスの作成](#firestoreインデックスの作成)
3. [Cloud Functionのデプロイ](#cloud-functionのデプロイ)
4. [Pub/Subトピックの作成](#pubsubトピックの作成)
5. [Cloud Schedulerの設定](#cloud-schedulerの設定)
6. [動作確認](#動作確認)
7. [トラブルシューティング](#トラブルシューティング)

## 前提条件

- Google Cloud Project が作成済み
- Firebase プロジェクトが設定済み
- gcloud CLI がインストール済み
- Firebase CLI がインストール済み
- 適切な権限を持つGCPアカウント

### 必要な権限

以下のIAMロールが必要です：

- `roles/cloudfunctions.admin`
- `roles/cloudscheduler.admin`
- `roles/pubsub.admin`
- `roles/datastore.indexAdmin`

### 環境変数の設定

```bash
# プロジェクトIDを設定
export GCP_PROJECT_ID="your-project-id"
export FIREBASE_PROJECT_ID="your-firebase-project-id"

# gcloud プロジェクトを設定
gcloud config set project $GCP_PROJECT_ID
```

## Firestoreインデックスの作成

バッチ処理に必要なFirestoreインデックスを作成します。

### 1. インデックス定義ファイルの確認

`firestore.indexes.json` ファイルに以下のインデックスが含まれていることを確認します：

```json
{
  "indexes": [
    {
      "collectionGroup": "chats",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "projectId", "order": "ASCENDING" },
        { "fieldPath": "approved", "order": "ASCENDING" },
        { "fieldPath": "approvedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "knowledge",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "projectId", "order": "ASCENDING" },
        { "fieldPath": "archived", "order": "ASCENDING" },
        { "fieldPath": "lastUsed", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "knowledge",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "archived", "order": "ASCENDING" },
        { "fieldPath": "lastUsed", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "knowledge",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "projectId", "order": "ASCENDING" },
        { "fieldPath": "content", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "batchJobs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### 2. インデックスのデプロイ

```bash
# Firebaseインデックスをデプロイ
firebase deploy --only firestore:indexes

# デプロイ状態の確認
firebase firestore:indexes
```

**注意**: インデックスの作成には数分から数時間かかる場合があります。

### 3. インデックス作成状態の確認

```bash
# Firebase Consoleでインデックスの状態を確認
# https://console.firebase.google.com/project/[PROJECT-ID]/firestore/indexes
```

または、gcloud CLIで確認：

```bash
gcloud firestore indexes list
```

## Cloud Functionのデプロイ

### 1. 依存関係のインストール

```bash
cd functions
npm install
```

### 2. TypeScriptのビルド

```bash
npm run build
```

### 3. Cloud Functionのデプロイ

```bash
# 個別にデプロイ
firebase deploy --only functions:weeklyPatternExtraction

# または全てのfunctionsをデプロイ
firebase deploy --only functions
```

### 4. デプロイの確認

```bash
# デプロイされたfunctionsの一覧を確認
firebase functions:list

# または gcloud CLI で確認
gcloud functions list --filter="name:weeklyPatternExtraction"
```

## Pub/Subトピックの作成

Cloud Schedulerからトリガーするために、Pub/Subトピックを作成します。

**注意**: Cloud Functions の Pub/Sub トリガーを使用する場合、トピックは自動的に作成されるため、このステップは通常不要です。ただし、手動で作成する場合は以下の手順に従ってください。

### オプション: 手動でトピックを作成

```bash
# Pub/Subトピックの作成
gcloud pubsub topics create weekly-pattern-extraction

# トピックの確認
gcloud pubsub topics list

# トピックの詳細を表示
gcloud pubsub topics describe weekly-pattern-extraction
```

## Cloud Schedulerの設定

### 1. Cloud Scheduler APIの有効化

```bash
# Cloud Scheduler APIを有効化
gcloud services enable cloudscheduler.googleapis.com
```

### 2. App Engineアプリの初期化（初回のみ）

Cloud Schedulerを使用するには、App Engineアプリが必要です。

```bash
# App Engineアプリの作成（リージョンを指定）
gcloud app create --region=asia-northeast1

# 注意: 既にApp Engineアプリが存在する場合はスキップ
```

### 3. Cloud Schedulerジョブの作成

**オプション1: gcloud CLIで作成**

```bash
# スケジュールジョブの作成
gcloud scheduler jobs create pubsub weekly-pattern-extraction-job \
  --schedule="0 2 * * 0" \
  --time-zone="Asia/Tokyo" \
  --topic="weekly-pattern-extraction" \
  --message-body='{"trigger":"scheduled"}' \
  --description="Weekly pattern extraction and knowledge maintenance batch job"
```

**オプション2: Firebase CLI（推奨）**

Firebase Cloud Functionsの `pubsub.schedule()` を使用する場合、スケジュールは自動的に作成されます。

### 4. ジョブの確認

```bash
# スケジュールジョブの一覧
gcloud scheduler jobs list

# 特定のジョブの詳細
gcloud scheduler jobs describe weekly-pattern-extraction-job
```

### 5. ジョブの一時停止/再開

```bash
# ジョブを一時停止
gcloud scheduler jobs pause weekly-pattern-extraction-job

# ジョブを再開
gcloud scheduler jobs resume weekly-pattern-extraction-job
```

## 動作確認

### 1. 手動トリガーでテスト

スケジュールを待たずに、手動でジョブをトリガーします。

```bash
# Cloud Schedulerジョブを手動実行
gcloud scheduler jobs run weekly-pattern-extraction-job

# または、Pub/Subトピックに直接メッセージを発行
gcloud pubsub topics publish weekly-pattern-extraction \
  --message='{"trigger":"manual","dryRun":false}'
```

### 2. ログの確認

```bash
# Cloud Functionsのログをストリーミング
gcloud functions logs read weeklyPatternExtraction --limit=50

# リアルタイムでログを確認
gcloud functions logs read weeklyPatternExtraction --follow
```

または、Firebase Consoleでログを確認：

```
https://console.firebase.google.com/project/[PROJECT-ID]/functions/logs
```

### 3. Firestoreでジョブステータスを確認

Firebase Consoleまたはgcloud CLIでFirestoreの `batchJobs` コレクションを確認します。

```bash
# Firestoreのデータを確認（gcloud CLI）
gcloud firestore documents list batchJobs --limit=10
```

または、以下のコードスニペットをNode.jsで実行：

```javascript
const admin = require('firebase-admin');
admin.initializeApp();

async function checkJobStatus() {
  const jobs = await admin.firestore()
    .collection('batchJobs')
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();

  jobs.forEach((doc) => {
    const data = doc.data();
    console.log(`Job ${doc.id}:`, {
      status: data.status,
      progress: data.progress?.percentage + '%',
      result: data.result,
    });
  });
}

checkJobStatus();
```

### 4. 動作確認チェックリスト

- [ ] Cloud Functionが正常にデプロイされている
- [ ] Firestoreインデックスが全て作成済み（Building状態でない）
- [ ] Cloud Schedulerジョブが作成されている
- [ ] 手動実行が成功する
- [ ] `batchJobs` コレクションにジョブが記録される
- [ ] `learningPatterns` コレクションにパターンが追加される
- [ ] ログにエラーがない

## モニタリング

### 1. Cloud Consoleでモニタリング

```
https://console.cloud.google.com/functions/details/[REGION]/weeklyPatternExtraction?project=[PROJECT-ID]
```

### 2. メトリクスの確認

```bash
# 実行回数の確認
gcloud monitoring time-series list \
  --filter='metric.type="cloudfunctions.googleapis.com/function/execution_count"' \
  --format=json

# エラー率の確認
gcloud monitoring time-series list \
  --filter='metric.type="cloudfunctions.googleapis.com/function/execution_times"' \
  --format=json
```

### 3. アラートの設定

Cloud Consoleで以下のアラートを設定することを推奨：

- 実行時間が5分を超えた場合
- エラー率が10%を超えた場合
- 実行が失敗した場合

### 4. ログベースのメトリクス

```bash
# エラーログのフィルタ
gcloud logging read "resource.type=cloud_function AND resource.labels.function_name=weeklyPatternExtraction AND severity>=ERROR" --limit=20
```

## トラブルシューティング

### 問題1: ジョブが開始されない

**症状**: スケジュールされた時刻になってもジョブが実行されない

**確認項目**:
1. Cloud Schedulerジョブが有効（enabled）になっているか確認
   ```bash
   gcloud scheduler jobs describe weekly-pattern-extraction-job
   ```

2. Cloud Functions がデプロイされているか確認
   ```bash
   gcloud functions describe weeklyPatternExtraction
   ```

3. Pub/Subトピックが存在するか確認
   ```bash
   gcloud pubsub topics list | grep weekly-pattern-extraction
   ```

**解決策**:
```bash
# ジョブを再作成
gcloud scheduler jobs delete weekly-pattern-extraction-job
gcloud scheduler jobs create pubsub weekly-pattern-extraction-job \
  --schedule="0 2 * * 0" \
  --time-zone="Asia/Tokyo" \
  --topic="weekly-pattern-extraction" \
  --message-body='{"trigger":"scheduled"}'
```

### 問題2: タイムアウトエラー

**症状**: Function execution took 540001 ms, finished with status: 'timeout'

**確認項目**:
1. 処理対象のチャット数が多すぎないか
2. Firestoreインデックスが作成されているか
3. メモリ設定が適切か

**解決策**:

1. バッチサイズを調整：
   ```typescript
   // functions/src/scheduledWeeklyPatternExtraction.ts
   const BATCH_SIZE = 25; // 50から25に削減
   ```

2. メモリを増やす：
   ```typescript
   export const weeklyPatternExtraction = functions
     .runWith({
       memory: '4GB', // 2GBから4GBに増加
       timeoutSeconds: 540,
     })
   ```

3. 再デプロイ：
   ```bash
   firebase deploy --only functions:weeklyPatternExtraction
   ```

### 問題3: Permission Denied エラー

**症状**: Error: Permission denied on resource project [PROJECT-ID]

**確認項目**:
1. サービスアカウントの権限
2. IAMロールの設定

**解決策**:

```bash
# Cloud Functionsのサービスアカウントを確認
gcloud iam service-accounts list

# 必要な権限を付与
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:[SERVICE-ACCOUNT-EMAIL]" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:[SERVICE-ACCOUNT-EMAIL]" \
  --role="roles/pubsub.publisher"
```

### 問題4: Firestore インデックスエラー

**症状**: The query requires an index

**解決策**:

1. エラーメッセージに含まれるインデックス作成リンクをクリック
2. または、`firestore.indexes.json` に必要なインデックスを追加
3. デプロイ：
   ```bash
   firebase deploy --only firestore:indexes
   ```

4. インデックス作成完了を待つ（数分～数時間）

### 問題5: 重複検出が多すぎる

**症状**: 大量のナレッジが重複として検出される

**解決策**:

類似度閾値を調整：

```typescript
// functions/src/scheduledWeeklyPatternExtraction.ts
const SIMILARITY_THRESHOLD = 0.98; // 0.95から0.98に増加
```

### 問題6: メモリ不足エラー

**症状**: Error: memory limit exceeded

**解決策**:

1. メモリを増やす：
   ```typescript
   export const weeklyPatternExtraction = functions
     .runWith({
       memory: '4GB',
       timeoutSeconds: 540,
     })
   ```

2. バッチ処理を最適化：
   ```typescript
   // より小さいバッチサイズ
   const BATCH_SIZE = 25;

   // 処理後にメモリを解放
   if (global.gc) {
     global.gc();
   }
   ```

## セキュリティベストプラクティス

### 1. サービスアカウントの最小権限

Cloud Functionsに必要最小限の権限のみを付与：

```bash
# カスタムロールの作成
gcloud iam roles create weeklyBatchProcessor \
  --project=$GCP_PROJECT_ID \
  --title="Weekly Batch Processor" \
  --description="Role for weekly pattern extraction batch job" \
  --permissions=datastore.documents.get,datastore.documents.list,datastore.documents.create,datastore.documents.update \
  --stage=GA
```

### 2. Firestoreセキュリティルール

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Batch jobs - 管理者のみアクセス可能
    match /batchJobs/{jobId} {
      allow read: if request.auth != null &&
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow write: if false; // Cloud Functionsのみ
    }

    // Learning patterns - 全ユーザー読み取り可能
    match /learningPatterns/{patternId} {
      allow read: if request.auth != null;
      allow write: if false; // Cloud Functionsのみ
    }

    // Knowledge groups - 全ユーザー読み取り可能
    match /knowledgeGroups/{groupId} {
      allow read: if request.auth != null;
      allow write: if false; // Cloud Functionsのみ
    }
  }
}
```

### 3. 環境変数の管理

機密情報は環境変数として設定：

```bash
# Firebaseプロジェクトに環境変数を設定
firebase functions:config:set \
  batch.notification_email="admin@company.com" \
  batch.max_retries="3"

# 設定の確認
firebase functions:config:get

# デプロイ
firebase deploy --only functions
```

## 運用ガイド

### 日次チェック

- [ ] Cloud Schedulerジョブが正常に実行されているか
- [ ] エラーログがないか
- [ ] `batchJobs` コレクションの最新ジョブが `completed` か

### 週次チェック

- [ ] 処理時間の推移を確認
- [ ] 抽出されたパターン数を確認
- [ ] アーカイブされたナレッジ数を確認
- [ ] 重複検出数を確認

### 月次チェック

- [ ] コスト分析
- [ ] パフォーマンス最適化の検討
- [ ] アラート設定の見直し

## コスト見積もり

### Cloud Functions

- **実行時間**: 約3-5分/週
- **メモリ**: 2GB
- **月間推定コスト**: $0.50-$1.00

### Cloud Scheduler

- **ジョブ数**: 1個
- **実行頻度**: 週1回
- **月間推定コスト**: $0.10

### Firestore

- **読み取り**: 約1,000-5,000/週
- **書き込み**: 約100-500/週
- **月間推定コスト**: $0.20-$1.00

### 合計推定コスト

**$0.80-$2.10/月**

## 参考資料

- [Cloud Scheduler ドキュメント](https://cloud.google.com/scheduler/docs)
- [Cloud Pub/Sub ドキュメント](https://cloud.google.com/pubsub/docs)
- [Cloud Functions ドキュメント](https://cloud.google.com/functions/docs)
- [Firestore インデックス](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Firebase Functions スケジュール実行](https://firebase.google.com/docs/functions/schedule-functions)

## サポート

問題が解決しない場合は、以下の情報を含めてサポートに連絡してください：

1. エラーメッセージの全文
2. Cloud Functionsのログ
3. ジョブIDとタイムスタンプ
4. 実行環境の情報（プロジェクトID、リージョンなど）
