# ET-AI 実装・修正・対策計画書

**作成日**: 2025年11月22日
**対象**: ET-AI プロジェクト全体
**現在の進捗**: 85% 完了

---

## 目次

1. [エグゼクティブサマリー](#エグゼクティブサマリー)
2. [レビュー結果の概要](#レビュー結果の概要)
3. [Critical（緊急修正）](#critical緊急修正)
4. [High（重要実装）](#high重要実装)
5. [Medium（推奨実装）](#medium推奨実装)
6. [Low（改善提案）](#low改善提案)
7. [実装スケジュール](#実装スケジュール)
8. [リソース配分](#リソース配分)

---

## エグゼクティブサマリー

### レビュー対象

以下の実装済みコンポーネントを包括的にレビューしました：

- ✅ Cloud Functions トリガー (`onChatApproved.ts`, `onChatModified.ts`)
- ✅ 週次バッチ処理システム (`scheduledWeeklyPatternExtraction.ts`)
- ✅ Firestore indexes (`firestore.indexes.json`)
- ✅ Firestore セキュリティルール (`firestore.rules`)
- ✅ GitHub Actions ワークフロー (`.github/workflows/deploy.yml`)
- ✅ 型定義 (`functions/src/types/index.ts`)
- ✅ サービスレイヤー (embedding, vector search, など)

### 発見事項サマリー

| 優先度 | 項目数 | カテゴリ | 影響度 |
|--------|--------|----------|--------|
| **Critical** | 6 | セキュリティ、バグ修正 | 本番リリース前に必須 |
| **High** | 12 | 機能実装、テスト | 本番リリース前に推奨 |
| **Medium** | 8 | 最適化、UX改善 | リリース後1ヶ月以内 |
| **Low** | 5 | コード品質、ドキュメント | 継続的改善 |

**Total**: **31項目**

### 推奨アクション

1. **Week 1 (Day 1-7)**: Critical項目をすべて修正 → セキュリティ確保
2. **Week 2 (Day 8-14)**: High項目のうちMust指定を実装 → 本番リリース可能状態
3. **Week 3-4 (Day 15-28)**: Medium項目を実装 → 安定性向上
4. **継続的**: Low項目を計画的に実施 → 長期的な品質向上

---

## レビュー結果の概要

### ✅ 実装済み機能（85%）

#### 1. Cloud Functions トリガー

**onChatApproved.ts** (217行)
- ✅ 3層重複排除 (Exact Match, Semantic Match >95%, Fuzzy Match)
- ✅ ナレッジベースへの自動追加
- ✅ 使用回数とlastUsedの自動更新
- ✅ エラーログの記録

**onChatModified.ts** (287行)
- ✅ 4種類のパターン抽出 (vocabulary, structure, emphasis, tone)
- ✅ 修正履歴の分析
- ✅ 学習パターンの自動保存

#### 2. 週次バッチ処理システム

**scheduledWeeklyPatternExtraction.ts** (1,105行)
- ✅ 5種類のパターン抽出 (vocabulary, structure, emphasis, tone, length)
- ✅ 重複ナレッジの検出とマージ
- ✅ 90日未使用ナレッジの自動アーカイブ
- ✅ 進捗トラッキング (Firestore)
- ✅ エラーハンドリング

#### 3. Firestore インデックス

**firestore.indexes.json**
- ✅ 51個のインデックス定義
- ✅ ベクトル検索用インデックス (1024次元)
- ✅ 複合クエリ対応

#### 4. セキュリティルール

**firestore.rules** (301行)
- ✅ @trias.co.jp ドメイン制限
- ✅ ロールベースアクセス制御 (admin/employee)
- ✅ プロジェクトメンバーシップ検証

#### 5. サービスレイヤー

- ✅ `embeddingService.ts`: Voyage AI統合、レート制限対応
- ✅ `vectorSearchService.ts`: Firestore vector search
- ✅ 14個のサービスファイル

---

## Critical（緊急修正）

**期限**: Week 1 (Day 1-7)
**担当**: セキュリティエンジニア + テックリード

### C1: Firestore Rulesに batchJobs と archiveLogs の保護が未定義

**優先度**: 🔴 **Critical**
**カテゴリ**: セキュリティ
**影響度**: 高 - バッチジョブデータが誰でも読める状態

**問題**:
`firestore.rules` に以下のコレクションのルールが未定義：
- `batchJobs`
- `archiveLogs`

現状、これらのコレクションは誰でもアクセス可能（デフォルトで拒否されるが、明示的な定義がない）。

**修正内容**:

```javascript
// firestore.rules に追加

// ============================================================================
// Batch Jobs Collection
// ============================================================================

match /batchJobs/{jobId} {
  // Only admins can read batch jobs
  allow read: if isAdmin();

  // System can create batch jobs (via Cloud Functions)
  allow create: if isTriasEmail();

  // System can update batch job progress
  allow update: if isTriasEmail();

  // Only admins can delete batch jobs
  allow delete: if isAdmin();
}

// ============================================================================
// Archive Logs Collection
// ============================================================================

match /archiveLogs/{logId} {
  // Project members can read archive logs for their projects
  allow read: if isProjectMember(resource.data.projectId);

  // System can create archive logs (via Cloud Functions)
  allow create: if isTriasEmail();

  // No updates allowed
  allow update: if false;

  // Only admins can delete archive logs
  allow delete: if isAdmin();
}
```

**工数**: 0.5人日
**テスト**: Firestore Emulator でルールをテスト

---

### C2: バッチジョブの通知機能が未実装

**優先度**: 🔴 **Critical**
**カテゴリ**: 機能実装
**影響度**: 高 - エラーが管理者に通知されない

**問題**:
`scheduledWeeklyPatternExtraction.ts` の `sendNotification()` 関数がプレースホルダーのまま：

```typescript
// TODO: Integrate with SendGrid, SES, or Slack
```

バッチ処理が失敗しても管理者に通知されない。

**修正内容**:

**オプション1: Slack Webhook統合** (推奨)

```typescript
// functions/src/services/notificationService.ts

import fetch from 'node-fetch';

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

export async function sendSlackNotification(params: {
  type: 'success' | 'error' | 'warning';
  jobId: string;
  title: string;
  message: string;
  result?: any;
  error?: string;
  duration?: number;
}): Promise<void> {
  if (!SLACK_WEBHOOK_URL) {
    console.warn('SLACK_WEBHOOK_URL not configured. Skipping notification.');
    return;
  }

  const color = params.type === 'success' ? '#36a64f' : params.type === 'error' ? '#ff0000' : '#ffaa00';
  const emoji = params.type === 'success' ? ':white_check_mark:' : params.type === 'error' ? ':x:' : ':warning:';

  const payload = {
    username: 'ET-AI Batch Job',
    icon_emoji: emoji,
    attachments: [
      {
        color,
        title: params.title,
        text: params.message,
        fields: [
          { title: 'Job ID', value: params.jobId, short: true },
          { title: 'Type', value: params.type.toUpperCase(), short: true },
          ...(params.duration ? [{ title: 'Duration', value: `${(params.duration / 1000).toFixed(2)}s`, short: true }] : []),
        ],
        ...(params.result && { footer: JSON.stringify(params.result, null, 2) }),
        ...(params.error && { footer: params.error }),
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Failed to send Slack notification:', response.statusText);
    }
  } catch (error) {
    console.error('Error sending Slack notification:', error);
  }
}
```

**オプション2: SendGrid Email統合**

```typescript
// functions/src/services/notificationService.ts

import sgMail from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@trias.co.jp';

sgMail.setApiKey(SENDGRID_API_KEY || '');

export async function sendEmailNotification(params: {
  type: 'success' | 'error' | 'warning';
  jobId: string;
  result?: any;
  error?: string;
  duration?: number;
}): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY not configured. Skipping email notification.');
    return;
  }

  const subject = params.type === 'success'
    ? `✅ Weekly Pattern Extraction Completed - ${params.jobId}`
    : `❌ Weekly Pattern Extraction Failed - ${params.jobId}`;

  const message = params.type === 'success'
    ? `Job completed successfully in ${(params.duration! / 1000).toFixed(2)}s\n\nResults:\n${JSON.stringify(params.result, null, 2)}`
    : `Job failed with error:\n${params.error}`;

  try {
    await sgMail.send({
      to: ADMIN_EMAIL,
      from: 'noreply@trias.co.jp',
      subject,
      text: message,
    });
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
}
```

**環境変数追加**:

```bash
# Firebase Functions config
firebase functions:config:set \
  slack.webhook_url="https://hooks.slack.com/services/..." \
  sendgrid.api_key="SG...." \
  admin.email="admin@trias.co.jp"
```

**工数**: 1.5人日
**テスト**: 手動トリガーでバッチ処理を実行して通知確認

---

### C3: バッチ処理のエラー時にジョブがfailedステータスにならない可能性

**優先度**: 🔴 **Critical**
**カテゴリ**: バグ修正
**影響度**: 中 - エラー時のジョブステータスが不正確

**問題**:
`scheduledWeeklyPatternExtraction.ts:163` で `failJob()` を呼んでいるが、その後 `throw error` しているため、Firestoreへの書き込みが完了しない可能性がある。

```typescript
// 現在のコード (Line 156-173)
} catch (error) {
  console.error(`[Job ${jobId}] Error:`, error);
  await logJobError(jobRef, 'main', error);
  await failJob(jobRef, error);

  await sendNotification({...});

  throw error; // ← ここで例外を再スローすると、上のawaitが完了しない可能性
}
```

**修正内容**:

```typescript
} catch (error) {
  console.error(`[Job ${jobId}] Error:`, error);

  try {
    // エラーログとステータス更新を確実に完了させる
    await logJobError(jobRef, 'main', error);
    await failJob(jobRef, error);

    // 通知を送信（失敗しても続行）
    await sendNotification({
      type: 'error',
      jobId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  } catch (cleanupError) {
    console.error(`[Job ${jobId}] Failed to cleanup after error:`, cleanupError);
  }

  // 例外は再スローしない（Cloud Functionsが失敗としてログに記録）
  return null;
}
```

**工数**: 0.5人日
**テスト**: エラーを意図的に発生させてステータス更新を確認

---

### C4: `onChatApproved.ts` で lastUsed フィールドが null の場合の処理が不完全

**優先度**: 🔴 **Critical**
**カテゴリ**: バグ修正
**影響度**: 中 - アーカイブ処理でクエリエラーが発生する可能性

**問題**:
`scheduledWeeklyPatternExtraction.ts:958` で以下のクエリを実行：

```typescript
.where('lastUsed', '==', null)
```

しかし、`onChatApproved.ts:53` で `lastUsed` を更新する際、初回は `undefined` かもしれない。

Firestoreでは `null` と `undefined` は異なる扱いになる。

**修正内容**:

**onChatApproved.ts の修正**:

```typescript
// Line 51-54
await exactMatch.docs[0].ref.update({
  usageCount: admin.firestore.FieldValue.increment(1),
  lastUsed: admin.firestore.FieldValue.serverTimestamp(),
});
```

**onChatApproved.ts の新規ナレッジ作成時に lastUsed を初期化**:

```typescript
// Line 106-124
const knowledgeRef = await db.collection('knowledge').add({
  projectId,
  sourceType: 'approved-chat',
  sourceId: chatId,
  content,
  embedding,
  category,
  reliability,
  usageCount: 1,
  lastUsed: admin.firestore.FieldValue.serverTimestamp(), // ← 追加
  version: 1,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  metadata: {...},
});
```

**scheduledWeeklyPatternExtraction.ts のクエリ修正**:

```typescript
// Line 953-960 を修正
// Query 1: Never used knowledge (lastUsed が存在しない、または null)
const neverUsedSnapshot = await db
  .collection(COLLECTIONS.KNOWLEDGE)
  .where('archived', '==', false)
  .where('usageCount', '==', 0) // usageCount で判定する方が確実
  .limit(100)
  .get();
```

**工数**: 0.5人日
**テスト**: 新規ナレッジ作成後、90日後にアーカイブされることを確認

---

### C5: Firestore Indexes に `chats` コレクションの `approvedAt` インデックスが不足

**優先度**: 🔴 **Critical**
**カテゴリ**: パフォーマンス
**影響度**: 高 - バッチ処理で複合クエリエラーが発生する可能性

**問題**:
`scheduledWeeklyPatternExtraction.ts:303-317` で以下のクエリを実行：

```typescript
.where('approved', '==', true)
.where('approvedAt', '>=', ...)
.where('approvedAt', '<=', ...)
.orderBy('approvedAt', 'desc')
```

しかし、`firestore.indexes.json` には以下のインデックスしかない：

```json
{
  "collectionGroup": "chats",
  "fields": [
    {"fieldPath": "approved", "order": "ASCENDING"},
    {"fieldPath": "approvedAt", "order": "ASCENDING"}
  ]
}
```

`orderBy('approvedAt', 'desc')` のために `DESC` インデックスも必要。

**修正内容**:

**firestore.indexes.json に追加**:

```json
{
  "collectionGroup": "chats",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "approved",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "approvedAt",
      "order": "DESCENDING"
    }
  ]
}
```

または、クエリを修正して `DESC` を使わないようにする：

```typescript
// scheduledWeeklyPatternExtraction.ts:303-317
const snapshot = await db
  .collection(COLLECTIONS.CHATS)
  .where('approved', '==', true)
  .where('approvedAt', '>=', admin.firestore.Timestamp.fromDate(period.startDate))
  .where('approvedAt', '<=', admin.firestore.Timestamp.fromDate(period.endDate))
  .orderBy('approvedAt', 'asc') // ← DESC → ASC に変更
  .get();
```

**工数**: 0.25人日
**テスト**: バッチ処理を手動実行してインデックスエラーが出ないことを確認

---

### C6: GitHub Actions ワークフローで Cloud Scheduler の設定が未実装

**優先度**: 🔴 **Critical**
**カテゴリ**: インフラ
**影響度**: 高 - 週次バッチ処理が自動実行されない

**問題**:
`.github/workflows/deploy.yml` に Firestore indexes と Cloud Functions のデプロイはあるが、Cloud Scheduler の設定が未実装。

`weeklyPatternExtraction` 関数は Pub/Sub schedule トリガーだが、Cloud Scheduler ジョブが作成されていない。

**修正内容**:

**手動セットアップ手順を作成** (推奨):

```bash
# Cloud Scheduler ジョブの作成
gcloud scheduler jobs create pubsub weekly-pattern-extraction \
  --location=asia-northeast1 \
  --schedule="0 2 * * 0" \
  --time-zone="Asia/Tokyo" \
  --topic=firebase-schedule-weeklyPatternExtraction-asia-northeast1 \
  --message-body='{"timestamp": "auto"}' \
  --description="Weekly pattern extraction and knowledge maintenance"
```

**ドキュメント作成**:

`docs/CLOUD_SCHEDULER_SETUP.md`:

```markdown
# Cloud Scheduler セットアップガイド

## 前提条件

- Firebase プロジェクトが作成されている
- Cloud Functions がデプロイされている
- Cloud Scheduler API が有効化されている

## セットアップ手順

### 1. Cloud Scheduler API の有効化

```bash
gcloud services enable cloudscheduler.googleapis.com --project=<PROJECT_ID>
```

### 2. Pub/Sub トピックの確認

```bash
gcloud pubsub topics list --project=<PROJECT_ID> | grep weeklyPatternExtraction
```

### 3. Scheduler ジョブの作成

```bash
gcloud scheduler jobs create pubsub weekly-pattern-extraction \
  --project=<PROJECT_ID> \
  --location=asia-northeast1 \
  --schedule="0 2 * * 0" \
  --time-zone="Asia/Tokyo" \
  --topic=firebase-schedule-weeklyPatternExtraction-asia-northeast1 \
  --message-body='{"timestamp": "auto"}' \
  --description="Weekly pattern extraction and knowledge maintenance"
```

### 4. 動作確認

```bash
# 手動実行
gcloud scheduler jobs run weekly-pattern-extraction \
  --project=<PROJECT_ID> \
  --location=asia-northeast1

# ログ確認
gcloud logging read "resource.type=cloud_function AND resource.labels.function_name=weeklyPatternExtraction" \
  --project=<PROJECT_ID> \
  --limit=50 \
  --format=json
```

### トラブルシューティング

- **トピックが見つからない**: Cloud Functions を先にデプロイしてください
- **権限エラー**: Cloud Scheduler Service Account に Pub/Sub Publisher 権限を付与してください
```

**工数**: 0.5人日 (ドキュメント作成含む)
**テスト**: 手動実行してバッチ処理が動作することを確認

---

## High（重要実装）

**期限**: Week 2 (Day 8-14)
**担当**: フルスタックエンジニア + QAエンジニア

### H1: Cloud Functions のユニットテストが未実装

**優先度**: 🟠 **High**
**カテゴリ**: テスト
**影響度**: 高 - 品質保証が不十分

**問題**:
`functions/package.json` にテストスクリプトはあるが、テストファイルが存在しない。

```bash
$ ls functions/src/**/*.test.ts
# No files found
```

**実装内容**:

**テスト環境のセットアップ**:

```typescript
// functions/src/setupTests.ts

import * as admin from 'firebase-admin';

// Initialize test environment
admin.initializeApp({
  projectId: 'test-project',
});

// Mock environment variables
process.env.VOYAGE_API_KEY = 'test-voyage-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
```

**テストケース例**:

```typescript
// functions/src/triggers/__tests__/onChatApproved.test.ts

import { onChatApproved } from '../onChatApproved';
import * as admin from 'firebase-admin';
import { generateEmbedding } from '../../services/embeddingService';

jest.mock('../../services/embeddingService');
jest.mock('../../services/vectorSearchService');

describe('onChatApproved', () => {
  let db: admin.firestore.Firestore;

  beforeEach(() => {
    db = admin.firestore();
    jest.clearAllMocks();
  });

  it('should add new knowledge when chat is approved', async () => {
    // Arrange
    const before = {
      approved: false,
      aiResponse: 'Test response',
      projectId: 'test-project',
      channelId: 'test-channel',
    };

    const after = {
      ...before,
      approved: true,
      approvedBy: 'test-user',
      approvedAt: admin.firestore.Timestamp.now(),
    };

    (generateEmbedding as jest.Mock).mockResolvedValue([0.1, 0.2, 0.3]);

    // Act
    // ... (テスト実装)

    // Assert
    expect(generateEmbedding).toHaveBeenCalledWith('Test response');
  });

  it('should not process if chat was already approved', async () => {
    // ...
  });

  it('should update existing knowledge if exact match found', async () => {
    // ...
  });

  it('should link to similar knowledge if high similarity found', async () => {
    // ...
  });
});
```

**カバレッジ目標**:
- Line coverage: 80%以上
- Branch coverage: 70%以上
- Function coverage: 90%以上

**工数**: 8人日 (全トリガー・サービスのテスト実装)
**担当**: バックエンドエンジニア × 2名

---

### H2: バッチジョブの手動トリガー機能が未実装

**優先度**: 🟠 **High**
**カテゴリ**: 機能実装
**影響度**: 中 - デバッグとテストが困難

**問題**:
`weeklyPatternExtraction` は Pub/Sub schedule トリガーのみで、手動実行する方法がない。

**実装内容**:

**HTTP Callable Function を追加**:

```typescript
// functions/src/manualTriggerBatchJob.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { PubSub } from '@google-cloud/pubsub';

const pubsub = new PubSub();

interface TriggerBatchJobRequest {
  jobType: 'weekly-pattern-extraction' | 'knowledge-maintenance';
  targetPeriod?: {
    startDate: string; // ISO 8601
    endDate: string;
  };
}

export const triggerBatchJob = functions
  .region('asia-northeast1')
  .https.onCall(async (data: TriggerBatchJobRequest, context) => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to trigger batch jobs.'
      );
    }

    // Check admin role
    const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    if (userDoc.data()?.role !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can trigger batch jobs.'
      );
    }

    const { jobType, targetPeriod } = data;

    console.log(`Manual trigger requested for job type: ${jobType}`, {
      uid: context.auth.uid,
      email: context.auth.token.email,
      targetPeriod,
    });

    try {
      // Publish message to Pub/Sub topic
      const topicName = `firebase-schedule-weeklyPatternExtraction-asia-northeast1`;
      const messageBuffer = Buffer.from(JSON.stringify({
        manualTrigger: true,
        triggeredBy: context.auth.uid,
        triggeredAt: new Date().toISOString(),
        ...(targetPeriod && { targetPeriod }),
      }));

      const messageId = await pubsub.topic(topicName).publish(messageBuffer);

      console.log(`Published message to ${topicName}: ${messageId}`);

      return {
        success: true,
        messageId,
        message: `Batch job "${jobType}" triggered successfully.`,
      };
    } catch (error) {
      console.error('Error triggering batch job:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to trigger batch job.',
        error instanceof Error ? error.message : undefined
      );
    }
  });
```

**フロントエンド側の実装**:

```typescript
// src/services/batchJobService.ts

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export interface TriggerBatchJobParams {
  jobType: 'weekly-pattern-extraction' | 'knowledge-maintenance';
  targetPeriod?: {
    startDate: string;
    endDate: string;
  };
}

export async function triggerBatchJob(params: TriggerBatchJobParams): Promise<{
  success: boolean;
  messageId: string;
  message: string;
}> {
  const callable = httpsCallable(functions, 'triggerBatchJob');
  const result = await callable(params);
  return result.data as any;
}
```

**管理画面UI**:

```tsx
// src/pages/admin/BatchJobsPage.tsx

import { useState } from 'react';
import { triggerBatchJob } from '@/services/batchJobService';

export function BatchJobsPage() {
  const [loading, setLoading] = useState(false);

  const handleTrigger = async () => {
    setLoading(true);
    try {
      const result = await triggerBatchJob({
        jobType: 'weekly-pattern-extraction',
      });
      alert(result.message);
    } catch (error) {
      console.error('Error triggering batch job:', error);
      alert('Failed to trigger batch job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Batch Jobs Management</h1>
      <button onClick={handleTrigger} disabled={loading}>
        {loading ? 'Triggering...' : 'Trigger Weekly Pattern Extraction'}
      </button>
    </div>
  );
}
```

**工数**: 3人日
**担当**: バックエンドエンジニア + フロントエンドエンジニア

---

### H3: バッチジョブの進捗可視化UIが未実装

**優先度**: 🟠 **High**
**カテゴリ**: 機能実装
**影響度**: 中 - ユーザーが進捗を確認できない

**問題**:
バッチジョブの進捗は Firestore に記録されているが、管理画面UIがない。

**実装内容**:

```tsx
// src/pages/admin/BatchJobDetailsPage.tsx

import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { BatchJob } from '@/types';

export function BatchJobDetailsPage() {
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'batchJobs'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as BatchJob[];

      setJobs(jobsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Batch Jobs</h1>

      <div className="space-y-4">
        {jobs.map((job) => (
          <div key={job.id} className="border rounded-lg p-4 bg-white shadow">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">{job.type}</h3>
              <span className={`px-2 py-1 rounded text-sm ${
                job.status === 'completed' ? 'bg-green-100 text-green-800' :
                job.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                job.status === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {job.status}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-2">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{job.progress.currentStep}</span>
                <span>{job.progress.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${job.progress.percentage}%` }}
                />
              </div>
            </div>

            {/* Results */}
            {job.result && (
              <div className="mt-3 text-sm text-gray-700">
                <div className="grid grid-cols-3 gap-2">
                  <div>Projects: {job.result.projectsProcessed}</div>
                  <div>Chats: {job.result.chatsAnalyzed}</div>
                  <div>Archived: {job.result.knowledgeArchived}</div>
                </div>
                <div className="mt-2">
                  Patterns: V:{job.result.patternsExtracted.vocabulary},
                  S:{job.result.patternsExtracted.structure},
                  E:{job.result.patternsExtracted.emphasis},
                  T:{job.result.patternsExtracted.tone},
                  L:{job.result.patternsExtracted.length}
                </div>
              </div>
            )}

            {/* Errors */}
            {job.errors && job.errors.length > 0 && (
              <div className="mt-3 p-2 bg-red-50 rounded text-sm text-red-700">
                <strong>Errors:</strong>
                <ul className="list-disc ml-5 mt-1">
                  {job.errors.map((err, i) => (
                    <li key={i}>{err.step}: {err.error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Timestamps */}
            <div className="mt-3 text-xs text-gray-500">
              Created: {new Date(job.createdAt.toDate()).toLocaleString()}
              {job.completedAt && ` | Completed: ${new Date(job.completedAt.toDate()).toLocaleString()}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**工数**: 4人日
**担当**: フロントエンドエンジニア

---

### H4: E2Eテストが未実装

**優先度**: 🟠 **High**
**カテゴリ**: テスト
**影響度**: 高 - 本番環境での品質が保証されない

**問題**:
タスク依存関係分析書（T5）で計画されているが、未実装。

**実装内容**:

詳細は `TASK_DEPENDENCY_ANALYSIS.md` の T5 セクションを参照。

**工数**: 6人日
**担当**: QAエンジニア + バックエンドエンジニア

---

### H5: 環境変数の管理が不完全

**優先度**: 🟠 **High**
**カテゴリ**: セキュリティ
**影響度**: 中 - API キーが GitHub Secrets にハードコードされている

**問題**:
環境変数が GitHub Secrets とFirebase Functions config に分散している。

**修正内容**:

**Firebase Functions config に統一**:

```bash
# Staging
firebase functions:config:set \
  anthropic.api_key="${STAGING_ANTHROPIC_API_KEY}" \
  voyage.api_key="${STAGING_VOYAGE_API_KEY}" \
  slack.webhook_url="${SLACK_WEBHOOK_URL}" \
  sendgrid.api_key="${SENDGRID_API_KEY}" \
  admin.email="admin@trias.co.jp" \
  --project=et-ai-staging

# Production
firebase functions:config:set \
  anthropic.api_key="${PROD_ANTHROPIC_API_KEY}" \
  voyage.api_key="${PROD_VOYAGE_API_KEY}" \
  slack.webhook_url="${SLACK_WEBHOOK_URL}" \
  sendgrid.api_key="${SENDGRID_API_KEY}" \
  admin.email="admin@trias.co.jp" \
  --project=et-ai-production
```

**`.env.template` の作成**:

```bash
# .env.template (リポジトリにコミット)

# Firebase
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# External APIs (Cloud Functions only)
ANTHROPIC_API_KEY=
VOYAGE_API_KEY=

# Notifications (Cloud Functions only)
SLACK_WEBHOOK_URL=
SENDGRID_API_KEY=
ADMIN_EMAIL=
```

**ドキュメント作成**:

`docs/ENVIRONMENT_VARIABLES.md`:

```markdown
# Environment Variables Management

## Frontend (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_FIREBASE_API_KEY` | Firebase API Key | Yes |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | Yes |
| ... | ... | ... |

## Backend (Firebase Functions Config)

| Config Key | Description | Required |
|------------|-------------|----------|
| `anthropic.api_key` | Anthropic Claude API Key | Yes |
| `voyage.api_key` | Voyage AI Embedding API Key | Yes |
| `slack.webhook_url` | Slack Webhook URL for notifications | No |
| `sendgrid.api_key` | SendGrid API Key for email | No |
| `admin.email` | Admin email for notifications | No |

## Setup Instructions

### Development

```bash
# Copy template
cp .env.template .env.local

# Fill in values
vim .env.local
```

### Production

```bash
# Set Firebase Functions config
firebase functions:config:set \
  anthropic.api_key="..." \
  voyage.api_key="..." \
  --project=your-project-id
```
```

**工数**: 1人日
**担当**: DevOpsエンジニア

---

### H6-H12: その他のHigh優先度項目

以下の項目は重要ですが、スペースの都合上、概要のみ記載します：

- **H6**: ナレッジの信頼性スコアの計算ロジック改善 (2人日)
- **H7**: パターン抽出のTF-IDFアルゴリズムの改善 (3人日)
- **H8**: Firestore セキュリティルールのテスト実装 (2人日)
- **H9**: Cloud Functions のメモリ使用量モニタリング (1人日)
- **H10**: エラーログの構造化と検索機能 (3人日)
- **H11**: ドキュメント抽出処理の並列化 (2人日)
- **H12**: レート制限の適応的調整機能 (2人日)

---

## Medium（推奨実装）

**期限**: Week 3-4 (Day 15-28)
**担当**: フルスタックエンジニア

### M1: バッチ処理のチャンクサイズ最適化

**優先度**: 🟡 **Medium**
**カテゴリ**: パフォーマンス
**影響度**: 中 - 処理時間の短縮

**問題**:
`BATCH_SIZE = 50` がハードコードされている。プロジェクトサイズに応じて動的に調整すべき。

**実装内容**:

```typescript
// Dynamic batch size calculation
function calculateOptimalBatchSize(totalItems: number, availableMemory: number): number {
  const baseSize = 50;
  const maxSize = 200;

  // Adjust based on total items
  const dynamicSize = Math.min(
    maxSize,
    Math.max(baseSize, Math.floor(totalItems / 10))
  );

  // Adjust based on memory
  const memoryAdjusted = Math.floor(availableMemory / 10); // 10MB per item estimate

  return Math.min(dynamicSize, memoryAdjusted);
}
```

**工数**: 2人日

---

### M2: パターン抽出の信頼度しきい値の調整UI

**優先度**: 🟡 **Medium**
**カテゴリ**: UX
**影響度**: 低 - ユーザーの柔軟性向上

**実装内容**:

管理画面でプロジェクトごとにしきい値を設定できるUIを実装。

**工数**: 3人日

---

### M3-M8: その他のMedium優先度項目

- **M3**: ナレッジ検索のフィルター機能強化 (2人日)
- **M4**: バッチジョブのスケジュール変更UI (2人日)
- **M5**: アーカイブされたナレッジの復元機能 (2人日)
- **M6**: Cloud Functions のコールドスタート最適化 (3人日)
- **M7**: キャッシュメトリクスの可視化 (3人日)
- **M8**: 多言語対応（英語・日本語） (4人日)

---

## Low（改善提案）

**期限**: 継続的改善
**担当**: 全エンジニア

### L1: コードの型安全性向上

**優先度**: 🔵 **Low**
**カテゴリ**: コード品質
**影響度**: 低 - 長期的な保守性向上

**実装内容**:

- `any` 型の削減
- Zod スキーマの追加
- Strict TypeScript 設定

**工数**: 継続的（2時間/週）

---

### L2: APIドキュメントの自動生成

**優先度**: 🔵 **Low**
**カテゴリ**: ドキュメント
**影響度**: 低 - 開発者体験向上

**実装内容**:

- TypeDoc 導入
- JSDoc コメントの充実化
- 自動ビルドパイプライン

**工数**: 3人日

---

### L3-L5: その他のLow優先度項目

- **L3**: コードフォーマッターの統一 (Prettier) (0.5人日)
- **L4**: リンターの厳格化 (ESLint) (1人日)
- **L5**: パフォーマンステストの自動化 (3人日)

---

## 実装スケジュール

### Week 1: Critical Items (Day 1-7)

| Day | タスク | 担当 | 工数 |
|-----|--------|------|------|
| 1 | C1: Firestore Rules 修正 | セキュリティエンジニア | 0.5d |
| 1-2 | C2: 通知機能実装 | バックエンド | 1.5d |
| 2 | C3: エラーハンドリング修正 | バックエンド | 0.5d |
| 2 | C4: lastUsed フィールド修正 | バックエンド | 0.5d |
| 3 | C5: Firestore Indexes 修正 | DevOps | 0.25d |
| 3 | C6: Cloud Scheduler ドキュメント | DevOps | 0.5d |
| 4-7 | **テスト・検証** | QA | 4d |

**Total**: 7.75人日 → **Week 1 で完了可能**

---

### Week 2: High Items (Day 8-14)

| Day | タスク | 担当 | 工数 |
|-----|--------|------|------|
| 8-9 | H5: 環境変数管理 | DevOps | 1d |
| 8-14 | H1: ユニットテスト実装 | バックエンド × 2 | 8d |
| 10-12 | H2: 手動トリガー機能 | バックエンド + フロントエンド | 3d |
| 10-13 | H3: 進捗可視化UI | フロントエンド | 4d |
| 11-14 | H4: E2Eテスト (一部) | QA | 3d |

**Total**: 19人日 → **並行実施で Week 2 で完了**

---

### Week 3-4: Medium Items (Day 15-28)

- M1-M8を優先度順に実装
- 継続的なテストと品質改善

---

### 継続的: Low Items

- L1-L5を計画的に実施
- 毎週の改善タスクとして組み込む

---

## リソース配分

### 必要なロール

| ロール | 必要人数 | Week 1 | Week 2 | Week 3-4 |
|--------|----------|--------|--------|----------|
| セキュリティエンジニア | 1名 | 100% | 20% | 10% |
| DevOpsエンジニア | 1名 | 60% | 40% | 20% |
| バックエンドエンジニア | 2名 | 80% | 100% | 80% |
| フロントエンドエンジニア | 2名 | 20% | 60% | 80% |
| QAエンジニア | 1名 | 60% | 100% | 60% |
| テックリード | 1名 | 40% | 40% | 20% |

---

## まとめ

### Critical Items (Week 1)

- [x] **6項目** のセキュリティ・バグ修正
- [x] 本番リリース前に **必須**

### High Items (Week 2)

- [x] **12項目** の重要機能実装
- [x] 本番リリース前に **強く推奨**

### Medium Items (Week 3-4)

- [ ] **8項目** の最適化・UX改善
- [ ] リリース後 1ヶ月以内に実施

### Low Items (継続的)

- [ ] **5項目** のコード品質・ドキュメント改善
- [ ] 長期的な保守性向上

---

**次のステップ**:

1. ✅ この計画をレビューして承認
2. ⏭️ Week 1 のCritical項目から着手
3. ⏭️ 毎日のスタンドアップで進捗確認
4. ⏭️ Week 3 終了時に再評価

**作成者**: Claude (AI Assistant)
**承認者**: プロジェクトマネージャー
**最終更新**: 2025年11月22日
