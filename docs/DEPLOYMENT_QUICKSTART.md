# Phase 4 デプロイ & 運用クイックスタート

このガイドでは、Phase 4（障害対応システム）のデプロイと運用を素早く開始するための手順を説明します。

## 📋 前提条件

- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase プロジェクト
- Claude API キー
- Voyage AI API キー

## 🚀 クイックスタート（5分）

### 1. Firebase にログイン

```bash
firebase login
firebase use <your-project-id>
```

### 2. 環境変数の設定

```bash
# 対話的セットアップ
./scripts/setup-env.sh

# または手動で設定
firebase functions:config:set claude.api_key="YOUR_CLAUDE_API_KEY"
firebase functions:config:set voyage.api_key="YOUR_VOYAGE_API_KEY"
```

### 3. デプロイ前の検証

```bash
./scripts/verify-deployment.sh
```

### 4. Firestore インデックスのデプロイ

```bash
firebase deploy --only firestore:indexes
```

⏱️ インデックスの構築には数分かかります。Firebase Console で進捗を確認できます。

### 5. Cloud Functions のデプロイ

```bash
# すべての Functions をデプロイ
firebase deploy --only functions

# または Phase 4 の新しい Functions のみ
firebase deploy --only functions:scheduledHealthCheck,functions:getHealthStatus,functions:getHealthDashboardData
```

## 📊 運用・モニタリング

### ヘルスチェックの確認

```bash
# リアルタイムログ
firebase functions:log --only scheduledHealthCheck --follow

# 最近のログ
firebase functions:log --only scheduledHealthCheck --lines 50
```

### ヘルスダッシュボード

```bash
# TypeScriptで実装されたダッシュボード
ts-node scripts/monitor-health.ts

# オプション
ts-node scripts/monitor-health.ts --minutes 120 --verbose
```

**出力例：**
```
========================================
   ET-AI Health Monitoring Dashboard
========================================
Monitoring period: Last 60 minutes
Current time: 2025-11-21 12:30:00

📊 Error Logs Analysis
----------------------------------------
Total errors: 12
Recovered: 10 (83.3%)
Failed: 2 (16.7%)

By Service:
  claude: 8
  firestore: 3
  voyage: 1

By Severity:
  ⚠️ warning: 10
  ❌ critical: 2

🏥 Health Check Status
----------------------------------------
Latest check: 2025-11-21 12:25:00
Overall status: ✅ HEALTHY

Service Status:
  ✅ claude: HEALTHY
     Response time: 1234ms, Error rate: 0.05%
  ✅ firestore: HEALTHY
     Response time: 123ms, Error rate: 0.00%
  ✅ voyage: HEALTHY
     Response time: 567ms, Error rate: 0.01%
  ✅ storage: HEALTHY
     Response time: 234ms, Error rate: 0.00%

Uptime (last 12 checks): 100.0%

🚨 Active Alerts
----------------------------------------
✅ No active alerts

========================================
✅ All systems operational
```

### エラーログの分析

```bash
# 最近60分のエラーを分析
./scripts/analyze-errors.sh

# カスタム期間
./scripts/analyze-errors.sh 120 100  # 過去2時間、最大100件
```

### Firebase Console でのモニタリング

1. **Error Logs**: https://console.firebase.google.com/project/YOUR_PROJECT/firestore/data/error_logs
2. **Health Checks**: https://console.firebase.google.com/project/YOUR_PROJECT/firestore/data/healthChecks
3. **Alerts**: https://console.firebase.google.com/project/YOUR_PROJECT/firestore/data/alerts

## 🔧 トラブルシューティング

### Scheduled Function が実行されない

```bash
# Cloud Scheduler のジョブを確認
gcloud scheduler jobs list

# 手動で実行
gcloud scheduler jobs run firebase-schedule-scheduledHealthCheck-* --location=<REGION>
```

### インデックスエラー

```bash
# インデックスの状態を確認
firebase firestore:indexes

# 再デプロイ
firebase deploy --only firestore:indexes
```

### Functions のメモリ不足

```typescript
// functions/src/index.ts
export const getHealthDashboardData = functions
  .runWith({
    memory: '512MB',  // デフォルトは256MB
    timeoutSeconds: 60,
  })
  .https.onCall(async (data, context) => {
    // ...
  });
```

## 📁 作成されたファイル

### 環境設定
- `functions/.env.example` - 環境変数テンプレート
- `scripts/setup-env.sh` - 環境変数セットアップスクリプト

### デプロイ
- `scripts/verify-deployment.sh` - デプロイ前検証スクリプト
- `firestore.indexes.json` - Firestore インデックス定義（Phase 4 追加分）

### モニタリング
- `scripts/monitor-health.ts` - ヘルスダッシュボード
- `scripts/analyze-errors.sh` - エラーログ分析

### ドキュメント
- `docs/FAULT_TOLERANCE_DESIGN.md` - 障害対応設計書（詳細）
- `docs/PHASE4_DEPLOYMENT_TEST.md` - デプロイ & テスト手順書（詳細）
- `docs/DEPLOYMENT_QUICKSTART.md` - このファイル

### 実装コード
- `functions/src/services/errorHandler.ts` - エラーハンドリング
- `functions/src/utils/retryStrategy.ts` - リトライ戦略
- `functions/src/services/healthCheckService.ts` - ヘルスチェック

## 📚 詳細ドキュメント

より詳細な情報は以下を参照してください：

- [PHASE4_DEPLOYMENT_TEST.md](./PHASE4_DEPLOYMENT_TEST.md) - 包括的なデプロイ & テスト手順
- [FAULT_TOLERANCE_DESIGN.md](./FAULT_TOLERANCE_DESIGN.md) - システム設計と障害シナリオ
- [FALLBACK_IMPLEMENTATION_EXAMPLES.md](./FALLBACK_IMPLEMENTATION_EXAMPLES.md) - フォールバック実装例

## 🎯 次のステップ

1. **アラート通知の実装**
   - Email 通知（SendGrid, AWS SES）
   - Slack 通知（Webhook）

2. **カスタムダッシュボード**
   - React コンポーネントで既存 UI に統合
   - リアルタイム更新（Firestore リスナー）

3. **パフォーマンス最適化**
   - Cloud Functions のメモリ設定調整
   - インデックス最適化

4. **自動テスト**
   - CI/CD パイプラインでのテスト自動実行
   - デプロイ前の自動検証

## 💡 ヒント

- **定期的なモニタリング**: 1日1回ヘルスダッシュボードを確認
- **アラート対応**: 未確認アラートは24時間以内に対処
- **ログローテーション**: 90日以上古いログは定期的に削除
- **バックアップ**: エラーログとヘルスチェックデータは定期的にエクスポート

## 📞 サポート

問題が発生した場合：
1. `docs/PHASE4_DEPLOYMENT_TEST.md` のトラブルシューティングセクションを確認
2. Firebase Functions のログを確認: `firebase functions:log`
3. Cloud Monitoring でメトリクスを確認

---

**Last Updated**: 2025-11-21  
**Version**: 4.0.0
