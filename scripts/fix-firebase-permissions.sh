#!/bin/bash
# Firebase デプロイ権限を修正するスクリプト

set -e

echo "=========================================="
echo "Firebase デプロイ権限の修正"
echo "=========================================="
echo ""

# 色の定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# gcloud CLI のチェック
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ エラー: gcloud CLI がインストールされていません${NC}"
    echo "インストール方法: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

echo -e "${GREEN}✓${NC} gcloud CLI が見つかりました"
echo ""

# 現在のプロジェクトを確認
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ -z "$CURRENT_PROJECT" ]; then
    echo -e "${YELLOW}⚠ プロジェクトが設定されていません${NC}"
    echo ""
    echo "利用可能なプロジェクト:"
    gcloud projects list
    echo ""
    read -p "プロジェクト ID を入力してください: " PROJECT_ID
    gcloud config set project ${PROJECT_ID}
else
    echo -e "${BLUE}現在のプロジェクト:${NC} ${CURRENT_PROJECT}"
    read -p "このプロジェクトで続行しますか？ (y/n): " CONFIRM
    if [ "$CONFIRM" != "y" ]; then
        read -p "使用するプロジェクト ID を入力してください: " PROJECT_ID
        gcloud config set project ${PROJECT_ID}
    else
        PROJECT_ID=${CURRENT_PROJECT}
    fi
fi

echo ""
echo -e "${BLUE}プロジェクト:${NC} ${PROJECT_ID}"
echo ""

# サービスアカウントの選択
echo "サービスアカウントを確認しています..."
echo ""
gcloud iam service-accounts list

echo ""
echo "デプロイに使用しているサービスアカウントのメールアドレスを入力してください"
echo "（例: github-actions@${PROJECT_ID}.iam.gserviceaccount.com）"
read -p "サービスアカウント: " SERVICE_ACCOUNT

if [ -z "$SERVICE_ACCOUNT" ]; then
    echo -e "${RED}❌ エラー: サービスアカウントが入力されていません${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}対象サービスアカウント:${NC} ${SERVICE_ACCOUNT}"
echo ""

# 現在の権限を確認
echo "現在の権限を確認しています..."
echo ""
gcloud projects get-iam-policy ${PROJECT_ID} \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${SERVICE_ACCOUNT}" \
  --format="table(bindings.role)"

echo ""
read -p "権限を追加しますか？ (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    echo "処理を中止しました"
    exit 0
fi

echo ""
echo "必要な権限を追加しています..."
echo ""

# 必須: Service Usage Consumer（エラー解決に必要）
echo "1. Service Usage Consumer を追加..."
if gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/serviceusage.serviceUsageConsumer" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Service Usage Consumer を追加しました"
else
    echo -e "${YELLOW}⚠${NC} Service Usage Consumer の追加をスキップ（既に付与済みまたはエラー）"
fi

# Firebase Admin
echo "2. Firebase Admin を追加..."
if gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/firebase.admin" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Firebase Admin を追加しました"
else
    echo -e "${YELLOW}⚠${NC} Firebase Admin の追加をスキップ（既に付与済みまたはエラー）"
fi

# Cloud Functions Developer
echo "3. Cloud Functions Developer を追加..."
if gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudfunctions.developer" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Cloud Functions Developer を追加しました"
else
    echo -e "${YELLOW}⚠${NC} Cloud Functions Developer の追加をスキップ（既に付与済みまたはエラー）"
fi

# Cloud Datastore Index Admin
echo "4. Cloud Datastore Index Admin を追加..."
if gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/datastore.indexAdmin" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Cloud Datastore Index Admin を追加しました"
else
    echo -e "${YELLOW}⚠${NC} Cloud Datastore Index Admin の追加をスキップ（既に付与済みまたはエラー）"
fi

# Cloud Scheduler Admin
echo "5. Cloud Scheduler Admin を追加..."
if gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudscheduler.admin" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Cloud Scheduler Admin を追加しました"
else
    echo -e "${YELLOW}⚠${NC} Cloud Scheduler Admin の追加をスキップ（既に付与済みまたはエラー）"
fi

# Service Account User
echo "6. Service Account User を追加..."
if gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/iam.serviceAccountUser" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Service Account User を追加しました"
else
    echo -e "${YELLOW}⚠${NC} Service Account User の追加をスキップ（既に付与済みまたはエラー）"
fi

echo ""
echo "=========================================="
echo "権限の追加が完了しました"
echo "=========================================="
echo ""

# 更新後の権限を表示
echo "更新後の権限:"
gcloud projects get-iam-policy ${PROJECT_ID} \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${SERVICE_ACCOUNT}" \
  --format="table(bindings.role)"

echo ""
echo -e "${GREEN}✅ 完了！${NC}"
echo ""
echo "次のステップ:"
echo "1. 1〜2分待って権限が反映されるのを待ちます"
echo "2. Firebase デプロイを再試行します:"
echo ""
echo -e "   ${BLUE}firebase deploy --only firestore:indexes${NC}"
echo -e "   ${BLUE}firebase deploy --only functions${NC}"
echo ""
