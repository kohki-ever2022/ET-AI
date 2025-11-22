# ET-AI Deployment Checklist

## Overview

This checklist ensures a safe and successful deployment to staging/production environments.

## Pre-Deployment Checklist

### 1. Code Quality ✅

- [ ] All tests pass locally (`npm test` in functions directory)
- [ ] TypeScript compilation successful (`npm run build`)
- [ ] No TypeScript errors or warnings
- [ ] Code review completed (if applicable)
- [ ] Git branch is up to date with main/develop

### 2. Environment Variables 🔐

#### Frontend (.env)

- [ ] `VITE_FIREBASE_API_KEY` configured
- [ ] `VITE_FIREBASE_AUTH_DOMAIN` configured
- [ ] `VITE_FIREBASE_PROJECT_ID` configured
- [ ] `VITE_FIREBASE_STORAGE_BUCKET` configured
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID` configured
- [ ] `VITE_FIREBASE_APP_ID` configured
- [ ] `VITE_FIREBASE_REGION` set to `asia-northeast1`

#### Backend (Firebase Functions Config)

Verify configuration with:
```bash
firebase functions:config:get --project=et-ai-staging
```

Required:
- [ ] `anthropic.api_key` - Claude API key
- [ ] `voyage.api_key` - Voyage AI embedding API key

Optional (for full functionality):
- [ ] `slack.webhook_url` - Slack webhook for notifications
- [ ] `sendgrid.api_key` - SendGrid email API key

Set missing variables:
```bash
firebase functions:config:set anthropic.api_key="YOUR_KEY" --project=et-ai-staging
firebase functions:config:set voyage.api_key="YOUR_KEY" --project=et-ai-staging
firebase functions:config:set slack.webhook_url="YOUR_URL" --project=et-ai-staging
```

### 3. Dependencies 📦

- [ ] Frontend dependencies installed (`npm ci`)
- [ ] Functions dependencies installed (`cd functions && npm ci`)
- [ ] No security vulnerabilities (`npm audit`)
- [ ] All peer dependencies satisfied

### 4. Firebase Configuration 🔥

- [ ] Firebase project exists for target environment
- [ ] `.firebaserc` contains correct project alias
- [ ] Billing enabled (required for Cloud Functions)
- [ ] Firebase CLI authenticated (`firebase login`)
- [ ] Correct project selected (`firebase use <project-id>`)

### 5. Firestore Configuration 📊

- [ ] `firestore.rules` reviewed and updated
- [ ] `firestore.indexes.json` contains all required indexes
- [ ] Security rules tested (if possible)

Required indexes:
```json
{
  "indexes": [
    {
      "collectionGroup": "chats",
      "fields": [
        {"fieldPath": "approved", "order": "ASCENDING"},
        {"fieldPath": "approvedAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "knowledge",
      "fields": [
        {"fieldPath": "projectId", "order": "ASCENDING"},
        {"fieldPath": "archived", "order": "ASCENDING"},
        {"fieldPath": "usageCount", "order": "ASCENDING"}
      ]
    }
  ]
}
```

### 6. API Enablement 🔌

Ensure these APIs are enabled in Google Cloud Console:
- [ ] Cloud Functions API
- [ ] Cloud Firestore API
- [ ] Cloud Storage API
- [ ] Cloud Pub/Sub API
- [ ] Cloud Scheduler API
- [ ] Cloud Build API

Enable APIs:
```bash
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable storage-api.googleapis.com
gcloud services enable pubsub.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

---

## Deployment Execution

### Automated Deployment (Recommended)

Use the deployment script:
```bash
chmod +x scripts/deploy-staging.sh
./scripts/deploy-staging.sh
```

The script will:
1. ✅ Run pre-flight checks
2. ✅ Install dependencies
3. ✅ Build frontend and functions
4. ✅ Run tests
5. ✅ Deploy to staging
6. ✅ Generate deployment report

### Manual Deployment (Alternative)

If you prefer manual deployment:

#### Step 1: Build
```bash
# Build frontend
npm run build

# Build functions
cd functions
npm run build
cd ..
```

#### Step 2: Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules --project=et-ai-staging
```

#### Step 3: Deploy Firestore Indexes
```bash
firebase deploy --only firestore:indexes --project=et-ai-staging
```

**⚠️ Warning**: Index creation can take several minutes to hours depending on data volume.

#### Step 4: Deploy Cloud Functions
```bash
firebase deploy --only functions --project=et-ai-staging
```

**Note**: First deployment may take 5-10 minutes.

#### Step 5: Deploy Hosting (if configured)
```bash
firebase deploy --only hosting --project=et-ai-staging
```

---

## Post-Deployment Validation

### 1. Cloud Functions Verification ☁️

- [ ] All functions deployed successfully
- [ ] No deployment errors in logs
- [ ] Functions are accessible (check Firebase Console)

Check deployed functions:
```bash
firebase functions:list --project=et-ai-staging
```

Expected functions:
- `processFileUpload`
- `reprocessDocument`
- `vectorSearch`
- `duplicateStats`
- `processChat`
- `onChatApproved`
- `onChatModified`
- `weeklyPatternExtraction`
- `triggerBatchJob`
- `scheduledArchiveJob`
- `onUserUpdate`
- `onProjectUpdate`
- `onChannelUpdate`
- `scheduledHealthCheck`
- `checkBudgets`
- `generateDailyCostReport`
- `cleanupOldCostRecords`
- `monitorRateLimits`
- `cleanupOldAlerts`
- `generateDailyRateLimitReport`

### 2. Firestore Rules Verification 🔒

- [ ] Rules deployed successfully
- [ ] Test authentication (try accessing with/without auth)
- [ ] Test authorization (try accessing with different roles)

Test rules:
```bash
# In Firebase Console > Firestore > Rules
# Use the Rules Playground to simulate requests
```

### 3. Firestore Indexes Verification 📑

- [ ] Indexes are being created
- [ ] No index creation errors

Check index status:
```bash
firebase firestore:indexes --project=et-ai-staging
```

**Expected status**: `READY` or `CREATING`

If indexes are stuck in `CREATING` for >1 hour, check:
- Firestore usage quota
- Any error messages in console

### 4. Cloud Functions Logs 📝

- [ ] No errors in function logs
- [ ] Functions are initializing correctly

View logs:
```bash
firebase functions:log --project=et-ai-staging --limit=50
```

Look for:
- ✅ Function initialization messages
- ✅ No `Error` or `FATAL` level logs
- ⚠️ Any warnings that need attention

### 5. Frontend Verification 🌐

- [ ] Frontend accessible at hosting URL
- [ ] Login/logout works
- [ ] Core features accessible
- [ ] No console errors

Test:
1. Open browser to `https://et-ai-staging.web.app` (or your hosting URL)
2. Open Developer Console (F12)
3. Check for errors
4. Test login flow

---

## Cloud Scheduler Setup

After deployment, configure Cloud Scheduler for batch jobs:

### 1. Create Pub/Sub Topics

```bash
# Weekly pattern extraction topic
gcloud pubsub topics create firebase-schedule-weeklyPatternExtraction-asia-northeast1 \
  --project=et-ai-staging

# Knowledge maintenance topic (if needed)
gcloud pubsub topics create firebase-schedule-knowledgeMaintenance-asia-northeast1 \
  --project=et-ai-staging
```

### 2. Create Scheduler Jobs

**Weekly Pattern Extraction** (runs every Monday at 2 AM JST):
```bash
gcloud scheduler jobs create pubsub weeklyPatternExtraction \
  --location=asia-northeast1 \
  --schedule="0 2 * * 1" \
  --time-zone="Asia/Tokyo" \
  --topic=firebase-schedule-weeklyPatternExtraction-asia-northeast1 \
  --message-body='{"scheduled":true}' \
  --project=et-ai-staging
```

**Daily Cost Report** (runs daily at 1 AM JST):
```bash
gcloud scheduler jobs create pubsub dailyCostReport \
  --location=asia-northeast1 \
  --schedule="0 1 * * *" \
  --time-zone="Asia/Tokyo" \
  --topic=firebase-schedule-generateDailyCostReport-asia-northeast1 \
  --message-body='{"scheduled":true}' \
  --project=et-ai-staging
```

**Daily Health Check** (runs every 6 hours):
```bash
gcloud scheduler jobs create pubsub healthCheck \
  --location=asia-northeast1 \
  --schedule="0 */6 * * *" \
  --time-zone="Asia/Tokyo" \
  --topic=firebase-schedule-scheduledHealthCheck-asia-northeast1 \
  --message-body='{"scheduled":true}' \
  --project=et-ai-staging
```

### 3. Verify Scheduler Jobs

```bash
gcloud scheduler jobs list --location=asia-northeast1 --project=et-ai-staging
```

Expected output:
- `weeklyPatternExtraction` - ENABLED
- `dailyCostReport` - ENABLED
- `healthCheck` - ENABLED

### 4. Test Scheduler Jobs

Manually trigger a job to test:
```bash
gcloud scheduler jobs run weeklyPatternExtraction \
  --location=asia-northeast1 \
  --project=et-ai-staging
```

Check logs:
```bash
firebase functions:log --only weeklyPatternExtraction --project=et-ai-staging
```

---

## Slack Notification Testing

### 1. Test Manual Batch Job Trigger

Use the provided test script:
```bash
chmod +x scripts/test-notifications.sh
./scripts/test-notifications.sh
```

Or test manually in Firebase Console:
1. Go to Functions > triggerBatchJob
2. Click "Test function"
3. Enter test data:
```json
{
  "jobType": "weekly-pattern-extraction",
  "targetPeriod": {
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-01-07T23:59:59Z"
  }
}
```

### 2. Verify Slack Notification

- [ ] Slack channel receives notification
- [ ] Notification contains job ID
- [ ] Notification shows correct status (success/error)
- [ ] Timestamp is correct

Example success notification:
```
🟢 Batch Job Completed Successfully

Job ID: abc123-def456
Duration: 5.2 minutes
Projects Processed: 10
Chats Analyzed: 150
Knowledge Archived: 5
Patterns Extracted:
  • Vocabulary: 12
  • Structure: 8
  • Emphasis: 5
  • Tone: 9
  • Length: 3
```

### 3. Test Error Notification

Trigger a job with invalid parameters to test error notifications:
```json
{
  "jobType": "invalid-type"
}
```

Expected:
- [ ] Error notification sent to Slack
- [ ] Error details included
- [ ] Error is logged in Firestore

---

## Rollback Procedure

If deployment fails or critical issues are found:

### 1. Rollback Cloud Functions

```bash
# List function versions
firebase functions:list --project=et-ai-staging

# Rollback specific function
gcloud functions deploy FUNCTION_NAME \
  --source=PATH_TO_PREVIOUS_VERSION \
  --project=et-ai-staging \
  --region=asia-northeast1
```

### 2. Rollback Firestore Rules

```bash
# In Firebase Console > Firestore > Rules
# Click "Rollback" button to restore previous version
```

### 3. Disable Problematic Features

- Disable Cloud Scheduler jobs if batch processing has issues
- Set `slack.webhook_url` to empty to disable notifications
- Scale down function instances if cost is too high

---

## Monitoring and Alerts

### 1. Set Up Budget Alerts

- [ ] Budget created in Google Cloud Console
- [ ] Alert thresholds configured (50%, 80%, 100%)
- [ ] Alert emails configured

### 2. Monitor Function Metrics

Key metrics to watch:
- Invocation count
- Execution time
- Error rate
- Active instances

View in Firebase Console:
`https://console.firebase.google.com/project/et-ai-staging/functions`

### 3. Set Up Error Alerts

Configure alerts for:
- Function errors >5 per minute
- Firestore quota exceeded
- Storage quota exceeded

---

## Security Checklist

- [ ] Firestore security rules restrict access appropriately
- [ ] API keys stored in Firebase config (not in code)
- [ ] Cloud Functions have appropriate IAM roles
- [ ] No sensitive data in logs
- [ ] CORS configured correctly for frontend
- [ ] Admin operations require authentication + role check

---

## Performance Checklist

- [ ] Cloud Functions min/max instances configured
- [ ] Firestore indexes cover all queries
- [ ] Large batch operations use chunking
- [ ] Rate limiting implemented for API calls
- [ ] Caching enabled where appropriate
- [ ] Cold start optimization (minInstances > 0 for critical functions)

---

## Documentation Updates

- [ ] API documentation updated
- [ ] Environment variables documented
- [ ] Deployment process documented
- [ ] Architecture diagrams updated (if changed)
- [ ] README.md updated with new features

---

## Sign-Off

### Deployment Information

- **Date**: ___________________
- **Environment**: [ ] Staging [ ] Production
- **Deployed By**: ___________________
- **Git Commit**: ___________________
- **Approved By**: ___________________

### Verification Sign-Off

- [ ] Pre-deployment checklist completed
- [ ] Deployment executed successfully
- [ ] Post-deployment validation completed
- [ ] Cloud Scheduler configured
- [ ] Slack notifications tested
- [ ] No critical errors in logs
- [ ] Rollback procedure documented and understood

**Notes/Issues**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

## Reference Links

- **Firebase Console**: https://console.firebase.google.com/project/et-ai-staging
- **Google Cloud Console**: https://console.cloud.google.com/
- **Cloud Scheduler Setup**: docs/CLOUD_SCHEDULER_SETUP.md
- **Environment Variables**: docs/ENVIRONMENT_VARIABLES.md
- **Implementation Plan**: docs/IMPLEMENTATION_AND_FIX_PLAN.md

---

## Emergency Contacts

- **System Administrator**: ___________________
- **On-Call Engineer**: ___________________
- **Firebase Support**: https://firebase.google.com/support

---

*Last Updated: 2025-01-22*
