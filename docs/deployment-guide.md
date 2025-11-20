# Phase 3 本番環境デプロイガイド

## 概要

Phase 3実装を本番環境にデプロイし、95%読み取り削減目標を検証するための手順書です。

## 前提条件

- Firebase CLI インストール済み (v14.25.1以降)
- Firebase プロジェクトへのデプロイ権限
- Node.js 18以降
- npm または yarn

## デプロイ手順

### ステップ 1: Firebase プロジェクト設定確認

```bash
# 現在のディレクトリで Firebase プロジェクトを確認
firebase projects:list

# プロジェクトが設定されていない場合、設定
firebase use <your-project-id>

# または、新規プロジェクトを作成
firebase projects:create
```

### ステップ 2: 依存関係のインストール

```bash
# ルートディレクトリの依存関係
npm install

# Cloud Functions の依存関係
cd functions
npm install
cd ..
```

### ステップ 3: TypeScript コンパイル確認

```bash
# Cloud Functions のビルド
cd functions
npm run build

# エラーがないことを確認
# ビルド成功: functions/lib/ にコンパイル済みファイルが生成される
cd ..
```

### ステップ 4: Firestore インデックスのデプロイ

**重要**: 新しいインデックスの構築には時間がかかります（数分〜数時間）。

```bash
# Firestore インデックスのみデプロイ
firebase deploy --only firestore:indexes

# デプロイ完了後、Firebase Console で確認
# https://console.firebase.google.com/project/<your-project-id>/firestore/indexes
```

**追加されたインデックス** (14個):
- `chats` コレクション: archived フィールド対応 (3個)
- `channels` コレクション: archived フィールド対応 (1個)
- `rateLimitUsage` コレクション: タイムスタンプクエリ (2個)
- `performanceMetrics` コレクション: 操作・ユーザー別 (3個)
- `queuedRequests` コレクション: 優先度・ステータス (2個)
- `users` コレクション: アクティビティ追跡 (2個)

**インデックス構築状況の確認**:
```bash
# Firebase Console でステータス確認
# または CLI で確認
firebase firestore:indexes
```

### ステップ 5: Cloud Functions のデプロイ

**注意**: 本番環境へのデプロイなので、十分に確認してから実行してください。

```bash
# すべての Cloud Functions をデプロイ
firebase deploy --only functions

# 特定の関数のみデプロイする場合
firebase deploy --only functions:functionName
```

**デプロイされる新規 Cloud Functions**:

**Phase 2 関連**:
- `monitorRateLimits` (scheduled: every 1 minute)
- `cleanupOldAlerts` (scheduled: every 24 hours)
- `generateDailyRateLimitReport` (scheduled: every 24 hours)

**Phase 3 関連**:
- `scheduledArchiveJob` (scheduled: every day 02:00 UTC)
- `runManualArchive` (callable)
- `getArchiveStats` (callable)
- `unarchiveChatFunction` (callable)
- `unarchiveChannelFunction` (callable)
- `onUserUpdate` (Firestore trigger)
- `onProjectUpdate` (Firestore trigger)
- `onChannelUpdate` (Firestore trigger)
- `validateReadReduction` (callable)

**デプロイ時間**: 10-15分程度

**デプロイ確認**:
```bash
# デプロイされた関数のリスト
firebase functions:list

# ログの確認
firebase functions:log
```

### ステップ 6: 既存データの初期化 (初回のみ)

Phase 3の機能を既存データに適用するため、初期化スクリプトを実行します。

**6-1: Archive フィールドの初期化**

すべての既存チャット・チャネルに `archived: false` を設定:

```typescript
// Firebase Console の Functions タブから直接実行、または
// Admin SDK を使用したスクリプトで実行

import { initializeArchiveFields } from './functions/src/services/archiveService';

const result = await initializeArchiveFields();
console.log(`Initialized: ${result.chatsUpdated} chats, ${result.channelsUpdated} channels`);
```

**6-2: デノーマライズデータの初期化**

既存のチャット・チャネルにデノーマライズデータを追加:

```typescript
import { batchDenormalizeExistingData } from './functions/src/services/denormalizationService';

// チャットのデノーマライゼーション
const chatResult = await batchDenormalizeExistingData('chats');
console.log(`Denormalized ${chatResult.updated} chats`);

// チャネルのデノーマライゼーション
const channelResult = await batchDenormalizeExistingData('channels');
console.log(`Denormalized ${channelResult.updated} channels`);
```

### ステップ 7: デプロイ検証

**7-1: Health Check**

```bash
# Health check エンドポイントにアクセス
curl https://<region>-<project-id>.cloudfunctions.net/healthCheck

# 期待されるレスポンス:
{
  "status": "ok",
  "timestamp": "2025-11-20T...",
  "service": "ET-AI Cloud Functions",
  "version": "3.0.0",
  "features": [
    ...
    "Phase 3: Archive System (90-day)",
    "Phase 3: Denormalization Service",
    "Phase 3: Read Reduction Validator"
  ]
}
```

**7-2: Scheduled Functions の確認**

```bash
# Cloud Scheduler でスケジュールされたジョブを確認
gcloud scheduler jobs list

# 期待される出力:
# - monitorRateLimits (every 1 minutes)
# - cleanupOldAlerts (every 24 hours)
# - generateDailyRateLimitReport (every 24 hours)
# - scheduledArchiveJob (every day 02:00)
```

**7-3: Firestore Triggers の確認**

Firebase Console で確認:
1. `users/{userId}` → onUpdate → onUserUpdate
2. `projects/{projectId}` → onUpdate → onProjectUpdate
3. `channels/{channelId}` → onUpdate → onChannelUpdate

### ステップ 8: 95%削減検証の実行

**8-1: 検証スクリプトの実行**

```typescript
// scripts/validate-reduction.ts
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const validateReadReduction = httpsCallable(functions, 'validateReadReduction');

const result = await validateReadReduction();
console.log('Validation Result:', result.data);
console.log('Report:\n', result.data.report);
```

または、Firebase Console から直接実行:
1. Functions タブ → `validateReadReduction` を選択
2. "Test function" をクリック
3. 空のペイロード `{}` で実行
4. 結果を確認

**期待される結果**:
```json
{
  "success": true,
  "validation": {
    "overall": {
      "totalReductionPercentage": 95.2,
      "goalAchieved": true
    },
    "scenarios": [
      {
        "scenario": "Load 100 chats with user and project data",
        "reduction": {
          "percentage": 89.5,
          "reads": 180
        },
        "goalAchieved": true
      },
      ...
    ]
  }
}
```

**8-2: パフォーマンスダッシュボードでの確認**

アプリケーションにアクセスし、パフォーマンスダッシュボードを開く:
1. `/performance-dashboard` にアクセス
2. 以下のメトリクスを確認:
   - Cache Hit Rate: 70%以上
   - Read Reduction: 95%目標達成
   - Rate Limit Usage: 60%未満
   - Archive Statistics: 適切なアーカイブ率

### ステップ 9: モニタリング設定

**9-1: Cloud Monitoring アラート設定**

```bash
# Firebase Console → Monitoring → Alerts で以下を設定
1. Rate Limit Usage > 80% でアラート
2. Cache Hit Rate < 60% でアラート
3. Function Errors > 10/min でアラート
4. Function Execution Time > 10s でアラート
```

**9-2: ログモニタリング**

```bash
# リアルタイムログの監視
firebase functions:log --follow

# 特定の関数のログ
firebase functions:log --only validateReadReduction

# エラーログのみ
firebase functions:log --level error
```

## トラブルシューティング

### インデックス構築エラー

**エラー**: "Index creation failed"

**解決策**:
1. Firebase Console でインデックスのステータス確認
2. エラーメッセージを確認
3. 必要に応じて手動でインデックスを作成

### Cloud Functions デプロイエラー

**エラー**: "Deployment failed: build error"

**解決策**:
```bash
# TypeScript エラーを確認
cd functions
npm run build

# 依存関係を再インストール
rm -rf node_modules package-lock.json
npm install
```

**エラー**: "Permission denied"

**解決策**:
```bash
# Firebase にログイン
firebase login --reauth

# プロジェクトの権限を確認
firebase projects:list
```

### 既存データ初期化エラー

**エラー**: "Timeout exceeded"

**解決策**:
- バッチサイズを小さくする (500 → 100)
- 複数回に分けて実行
- Cloud Functions のタイムアウトを延長 (300s → 540s)

### 検証実行エラー

**エラー**: "Insufficient data for validation"

**解決策**:
- 本番環境にデータが存在することを確認
- テストデータを追加
- バリデーションロジックを調整

## ロールバック手順

問題が発生した場合のロールバック:

```bash
# 特定のバージョンにロールバック
firebase functions:delete functionName
firebase deploy --only functions:functionName --version <previous-version>

# Firestore インデックスは手動で削除
# Firebase Console → Firestore → Indexes で不要なインデックスを削除
```

## パフォーマンス最適化チェックリスト

デプロイ後、以下を確認:

- [ ] Firestore インデックスがすべて「有効」状態
- [ ] Cloud Functions がすべて正常にデプロイ済み
- [ ] Scheduled Functions が正常に実行中
- [ ] Firestore Triggers が動作確認済み
- [ ] Archive フィールドが初期化済み
- [ ] デノーマライズデータが初期化済み
- [ ] 95%削減検証が成功
- [ ] パフォーマンスダッシュボードで正常なメトリクス
- [ ] エラーログが異常なし
- [ ] Rate Limit Usage が 60% 未満

## コスト見積もり

**Phase 3 デプロイ後の月間コスト** (50-100 ユーザー):

**Firestore**:
- 読み取り: 500K → 25K (95%削減) = $0.15/月
- 書き込み: 50K = $1.50/月
- ストレージ: 5GB = $1.00/月
- **小計: $2.65/月**

**Cloud Functions**:
- processChat: 20K invocations = $4.00/月
- vectorSearch: 10K invocations = $2.00/月
- Scheduled Functions: 44K invocations = $0.80/月
- Triggers: 5K invocations = $0.10/月
- **小計: $6.90/月**

**Claude API** (Tier 3):
- 15K-25K requests/day = $300-$600/月

**合計: $310-$610/月**

## 次のステップ

1. **24時間モニタリング**: デプロイ後24時間はダッシュボードを監視
2. **週次レビュー**: 週1回パフォーマンスメトリクスをレビュー
3. **月次最適化**: 月1回コスト分析とさらなる最適化検討
4. **Tier 3 申請**: 50ユーザー到達時に Claude API Tier 3 を申請

## サポート

問題が発生した場合:
1. Firebase Console のログを確認
2. `firebase functions:log --level error` でエラー確認
3. GitHub Issue を作成
4. チームに報告

---

**Document Version**: 1.0
**Last Updated**: 2025-11-20
**Owner**: Engineering Team
