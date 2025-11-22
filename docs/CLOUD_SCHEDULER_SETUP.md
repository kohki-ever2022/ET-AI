# Cloud Scheduler セットアップガイド

**作成日**: 2025年11月22日
**対象**: ET-AI 週次バッチ処理
**担当**: DevOpsエンジニア

---

## 概要

このガイドでは、ET-AIの週次パターン抽出バッチ処理を自動実行するためのCloud Schedulerの設定方法を説明します。

## 前提条件

- ✅ Firebase プロジェクトが作成されている
- ✅ Cloud Functions がデプロイされている（`weeklyPatternExtraction` 関数）
- ✅ `gcloud` CLI がインストールされている
- ✅ 適切な権限を持つGCPアカウント

---

## セットアップ手順

### 1. Cloud Scheduler API の有効化

```bash
# Staging環境
gcloud services enable cloudscheduler.googleapis.com \
  --project=<STAGING_PROJECT_ID>

# Production環境
gcloud services enable cloudscheduler.googleapis.com \
  --project=<PRODUCTION_PROJECT_ID>
```

**確認**:

```bash
gcloud services list --enabled \
  --project=<PROJECT_ID> \
  --filter="name:cloudscheduler"
```

---

### 2. Pub/Sub トピックの確認

Cloud Functionsの`schedule`トリガーは、自動的にPub/Subトピックを作成します。
デプロイ後、トピックが作成されていることを確認します。

```bash
gcloud pubsub topics list \
  --project=<PROJECT_ID> \
  --filter="name:weeklyPatternExtraction"
```

**期待される出力**:

```
name: projects/<PROJECT_ID>/topics/firebase-schedule-weeklyPatternExtraction-asia-northeast1
```

トピックが見つからない場合は、Cloud Functionsが正しくデプロイされていない可能性があります。

```bash
# Cloud Functionsの確認
firebase functions:list --project=<PROJECT_ID>
```

---

### 3. Cloud Scheduler ジョブの作成

#### Staging環境

```bash
gcloud scheduler jobs create pubsub weekly-pattern-extraction-staging \
  --project=<STAGING_PROJECT_ID> \
  --location=asia-northeast1 \
  --schedule="0 2 * * 0" \
  --time-zone="Asia/Tokyo" \
  --topic=firebase-schedule-weeklyPatternExtraction-asia-northeast1 \
  --message-body='{"timestamp": "auto", "environment": "staging"}' \
  --description="[Staging] Weekly pattern extraction and knowledge maintenance"
```

#### Production環境

```bash
gcloud scheduler jobs create pubsub weekly-pattern-extraction-production \
  --project=<PRODUCTION_PROJECT_ID> \
  --location=asia-northeast1 \
  --schedule="0 2 * * 0" \
  --time-zone="Asia/Tokyo" \
  --topic=firebase-schedule-weeklyPatternExtraction-asia-northeast1 \
  --message-body='{"timestamp": "auto", "environment": "production"}' \
  --description="[Production] Weekly pattern extraction and knowledge maintenance"
```

**スケジュール説明**:
- `0 2 * * 0`: 毎週日曜日の午前2時（JST）
- Cron形式: `分 時 日 月 曜日`

**カスタマイズ例**:

```bash
# 毎日午前3時に実行
--schedule="0 3 * * *"

# 毎週月曜日と木曜日の午前1時に実行
--schedule="0 1 * * 1,4"

# 毎月1日の午前0時に実行
--schedule="0 0 1 * *"
```

---

### 4. ジョブの確認

```bash
# ジョブ一覧を表示
gcloud scheduler jobs list \
  --project=<PROJECT_ID> \
  --location=asia-northeast1

# 特定のジョブの詳細を表示
gcloud scheduler jobs describe weekly-pattern-extraction-production \
  --project=<PROJECT_ID> \
  --location=asia-northeast1
```

**期待される出力**:

```yaml
name: projects/<PROJECT_ID>/locations/asia-northeast1/jobs/weekly-pattern-extraction-production
pubsubTarget:
  topicName: projects/<PROJECT_ID>/topics/firebase-schedule-weeklyPatternExtraction-asia-northeast1
  data: eyJ0aW1lc3RhbXAiOiAiYXV0byIsICJlbnZpcm9ubWVudCI6ICJwcm9kdWN0aW9uIn0=
schedule: 0 2 * * 0
timeZone: Asia/Tokyo
state: ENABLED
```

---

### 5. 手動実行でテスト

本番実行前に、手動でジョブを実行してテストします。

```bash
# ジョブを手動実行
gcloud scheduler jobs run weekly-pattern-extraction-staging \
  --project=<STAGING_PROJECT_ID> \
  --location=asia-northeast1
```

**実行結果の確認**:

```bash
# Cloud Functionsのログを確認（最新50件）
gcloud logging read \
  "resource.type=cloud_function AND resource.labels.function_name=weeklyPatternExtraction" \
  --project=<PROJECT_ID> \
  --limit=50 \
  --format=json \
  --freshness=10m
```

または、Firebase Console で確認：
- [Firebase Console](https://console.firebase.google.com/)
- Functions → ログ → `weeklyPatternExtraction`

---

### 6. Slack通知の設定（オプション）

バッチジョブの実行結果をSlackに通知するには、Webhook URLを設定します。

```bash
# Firebase Functions config に Slack Webhook URL を設定
firebase functions:config:set \
  slack.webhook_url="https://hooks.slack.com/services/YOUR/WEBHOOK/URL" \
  --project=<PROJECT_ID>

# 設定を確認
firebase functions:config:get --project=<PROJECT_ID>

# 設定を反映するため、再デプロイ
firebase deploy --only functions --project=<PROJECT_ID>
```

**Slack Webhook URLの取得方法**:

1. Slackワークスペースで [Incoming Webhooks App](https://api.slack.com/messaging/webhooks) を有効化
2. 通知先チャンネルを選択（例: `#et-ai-notifications`）
3. Webhook URLをコピー

---

## トラブルシューティング

### エラー: "Topic not found"

**原因**: Cloud Functionsがまだデプロイされていない、またはトピック名が間違っている。

**解決方法**:

```bash
# Cloud Functionsを先にデプロイ
firebase deploy --only functions --project=<PROJECT_ID>

# トピック名を確認
gcloud pubsub topics list --project=<PROJECT_ID>
```

---

### エラー: "Permission denied"

**原因**: Cloud Scheduler Service Accountに必要な権限がない。

**解決方法**:

```bash
# Service Accountを確認
gcloud iam service-accounts list --project=<PROJECT_ID>

# Pub/Sub Publisher 権限を付与
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:cloud-scheduler@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/pubsub.publisher"
```

---

### ジョブが実行されない

**原因1**: ジョブが無効化されている

```bash
# ジョブを有効化
gcloud scheduler jobs resume weekly-pattern-extraction-production \
  --project=<PROJECT_ID> \
  --location=asia-northeast1
```

**原因2**: スケジュールが間違っている

```bash
# スケジュールを更新
gcloud scheduler jobs update pubsub weekly-pattern-extraction-production \
  --project=<PROJECT_ID> \
  --location=asia-northeast1 \
  --schedule="0 2 * * 0"
```

**原因3**: タイムゾーンが間違っている

```bash
# タイムゾーンを確認・更新
gcloud scheduler jobs update pubsub weekly-pattern-extraction-production \
  --project=<PROJECT_ID> \
  --location=asia-northeast1 \
  --time-zone="Asia/Tokyo"
```

---

### バッチジョブがエラーで失敗する

**確認手順**:

1. **Cloud Functionsのログを確認**:

```bash
gcloud logging read \
  "resource.type=cloud_function AND resource.labels.function_name=weeklyPatternExtraction AND severity>=ERROR" \
  --project=<PROJECT_ID> \
  --limit=20 \
  --format=json
```

2. **Firestore の batchJobs コレクションを確認**:

Firebase Console → Firestore → `batchJobs` コレクション → 最新のジョブのステータスとエラーを確認

3. **Slack通知を確認**:

設定が正しければ、エラー発生時に通知が届きます。

---

## メンテナンス

### ジョブの一時停止

メンテナンス時など、一時的にジョブを停止する場合：

```bash
# ジョブを一時停止
gcloud scheduler jobs pause weekly-pattern-extraction-production \
  --project=<PROJECT_ID> \
  --location=asia-northeast1
```

### ジョブの再開

```bash
# ジョブを再開
gcloud scheduler jobs resume weekly-pattern-extraction-production \
  --project=<PROJECT_ID> \
  --location=asia-northeast1
```

### ジョブの削除

```bash
# ジョブを削除
gcloud scheduler jobs delete weekly-pattern-extraction-production \
  --project=<PROJECT_ID> \
  --location=asia-northeast1
```

---

## 監視とアラート

### Cloud Monitoring ダッシュボード

1. [GCP Console](https://console.cloud.google.com/) → Monitoring → Dashboards
2. 「Create Dashboard」をクリック
3. 以下のメトリクスを追加：
   - `cloud_scheduler/job/attempt_count`
   - `cloud_function/execution_count`
   - `cloud_function/execution_times`
   - `cloud_function/user_memory_bytes`

### アラートポリシー

**ジョブ失敗時のアラート**:

```bash
# アラートポリシーを作成（GCP Console または Terraform推奨）
```

1. Monitoring → Alerting → Create Policy
2. Metric: `cloud_scheduler/job/attempt_count`
3. Filter: `job_id = weekly-pattern-extraction-production AND response_code != 200`
4. Threshold: Count > 0
5. Notification channel: Email or PagerDuty

---

## 参考リンク

- [Cloud Scheduler ドキュメント](https://cloud.google.com/scheduler/docs)
- [Pub/Sub ドキュメント](https://cloud.google.com/pubsub/docs)
- [Firebase Cloud Functions スケジュール](https://firebase.google.com/docs/functions/schedule-functions)
- [Cron形式の説明](https://crontab.guru/)

---

**作成者**: DevOpsエンジニア
**最終更新**: 2025年11月22日
