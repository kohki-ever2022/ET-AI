#!/bin/bash

################################################################################
# ET-AI Notification Testing Script
#
# This script tests Slack notifications by triggering a manual batch job
# and monitoring the notification delivery.
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${1:-et-ai-staging}"
REGION="asia-northeast1"

################################################################################
# Helper Functions
################################################################################

print_header() {
  echo -e "\n${BLUE}==============================================================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}==============================================================================${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

################################################################################
# Pre-flight Checks
################################################################################

print_header "Slack Notification Test"

print_info "Project: $PROJECT_ID"
print_info "Region: $REGION"
echo

# Check Firebase CLI
if ! command -v firebase &> /dev/null; then
  print_error "Firebase CLI is not installed"
  exit 1
fi

# Check authentication
print_info "Checking Firebase authentication..."
if ! firebase projects:list &> /dev/null; then
  print_error "Not logged in to Firebase CLI"
  print_info "Run: firebase login"
  exit 1
fi
print_success "Firebase CLI authenticated"

# Check Slack webhook configuration
print_info "Checking Slack webhook configuration..."
SLACK_CONFIG=$(firebase functions:config:get slack.webhook_url --project=$PROJECT_ID 2>&1)

if [[ $SLACK_CONFIG == *"error"* ]] || [[ -z "$SLACK_CONFIG" ]] || [[ "$SLACK_CONFIG" == "null" ]]; then
  print_warning "Slack webhook URL is not configured"
  print_info "Set it with:"
  print_info "  firebase functions:config:set slack.webhook_url=\"YOUR_WEBHOOK_URL\" --project=$PROJECT_ID"
  echo
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
  fi
else
  print_success "Slack webhook URL is configured"
fi

################################################################################
# Test Options
################################################################################

print_header "Test Options"

echo "Select test type:"
echo "  1. Test success notification (with small dataset)"
echo "  2. Test error notification (invalid job type)"
echo "  3. Test warning notification (empty period)"
echo "  4. Direct Slack webhook test (no job execution)"
echo
read -p "Enter choice (1-4): " TEST_CHOICE

case $TEST_CHOICE in
  1)
    TEST_TYPE="success"
    print_info "Testing success notification..."
    ;;
  2)
    TEST_TYPE="error"
    print_info "Testing error notification..."
    ;;
  3)
    TEST_TYPE="warning"
    print_info "Testing warning notification..."
    ;;
  4)
    TEST_TYPE="direct"
    print_info "Testing direct Slack webhook..."
    ;;
  *)
    print_error "Invalid choice"
    exit 1
    ;;
esac

################################################################################
# Execute Test
################################################################################

print_header "Executing Test"

if [ "$TEST_TYPE" == "direct" ]; then
  # Direct webhook test
  print_info "Sending test message to Slack webhook..."

  WEBHOOK_URL=$(firebase functions:config:get slack.webhook_url --project=$PROJECT_ID | jq -r '.')

  if [ "$WEBHOOK_URL" == "null" ] || [ -z "$WEBHOOK_URL" ]; then
    print_error "Cannot retrieve webhook URL"
    exit 1
  fi

  # Create test payload
  PAYLOAD=$(cat <<EOF
{
  "username": "ET-AI Notification Test",
  "icon_emoji": ":test_tube:",
  "attachments": [
    {
      "color": "#0066cc",
      "title": "🧪 Slack Integration Test",
      "text": "This is a test message from the ET-AI notification system.",
      "fields": [
        {
          "title": "Test Time",
          "value": "$(date)",
          "short": true
        },
        {
          "title": "Project",
          "value": "$PROJECT_ID",
          "short": true
        },
        {
          "title": "Status",
          "value": "✅ Webhook connection successful",
          "short": false
        }
      ],
      "footer": "ET-AI Notification System",
      "ts": $(date +%s)
    }
  ]
}
EOF
)

  # Send to Slack
  RESPONSE=$(curl -s -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

  if [ "$RESPONSE" == "ok" ]; then
    print_success "Test message sent to Slack successfully"
    print_info "Check your Slack channel for the test message"
  else
    print_error "Failed to send test message"
    print_error "Response: $RESPONSE"
    exit 1
  fi

else
  # Trigger batch job for notification test

  # Prepare test data based on test type
  case $TEST_TYPE in
    success)
      # Calculate date range (last 7 days)
      END_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
      START_DATE=$(date -u -d "7 days ago" +"%Y-%m-%dT%H:%M:%SZ")

      TEST_DATA=$(cat <<EOF
{
  "jobType": "weekly-pattern-extraction",
  "targetPeriod": {
    "startDate": "$START_DATE",
    "endDate": "$END_DATE"
  }
}
EOF
)
      ;;

    error)
      # Invalid job type
      TEST_DATA='{"jobType": "invalid-job-type"}'
      ;;

    warning)
      # Empty period (should trigger warning)
      TEST_DATA=$(cat <<EOF
{
  "jobType": "weekly-pattern-extraction",
  "targetPeriod": {
    "startDate": "2020-01-01T00:00:00Z",
    "endDate": "2020-01-01T00:00:01Z"
  }
}
EOF
)
      ;;
  esac

  print_info "Test data:"
  echo "$TEST_DATA" | jq '.'
  echo

  # Create temporary file for test data
  TEMP_FILE=$(mktemp)
  echo "$TEST_DATA" > "$TEMP_FILE"

  print_info "Triggering batch job..."
  print_warning "This will execute a real Cloud Function call"
  echo

  # Note: We need to use the Firebase SDK from a Node.js script
  # because firebase CLI doesn't support direct function invocation

  # Create Node.js test script
  TEST_SCRIPT=$(mktemp).js

  cat > "$TEST_SCRIPT" <<'EOJS'
const admin = require('firebase-admin');
const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? require(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  : null;

const projectId = process.argv[2];
const testDataFile = process.argv[3];
const testData = require('fs').readFileSync(testDataFile, 'utf8');
const data = JSON.parse(testData);

// Initialize Firebase Admin
if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: projectId
  });
} else {
  admin.initializeApp({ projectId: projectId });
}

// Call the function
const functions = require('firebase-functions-test')();
const { triggerBatchJob } = require('../functions/lib/triggerBatchJob');

// Mock authenticated context
const context = {
  auth: {
    uid: 'test-user-id',
    token: {
      email: 'admin@trias.co.jp'
    }
  }
};

// Execute
triggerBatchJob(data, context)
  .then(result => {
    console.log('\n✅ SUCCESS:');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ ERROR:');
    console.error(error.message);
    process.exit(1);
  });
EOJS

  print_info "Alternative: Use Firebase Console to test"
  print_info "  1. Go to: https://console.firebase.google.com/project/$PROJECT_ID/functions"
  print_info "  2. Find 'triggerBatchJob' function"
  print_info "  3. Click 'Test function' tab"
  print_info "  4. Paste this JSON:"
  echo
  echo "$TEST_DATA" | jq '.'
  echo
  print_info "  5. Click 'Test the function'"
  echo

  read -p "Have you triggered the function? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_success "Function triggered"
  else
    print_info "Test cancelled"
    rm -f "$TEMP_FILE" "$TEST_SCRIPT"
    exit 0
  fi

  # Cleanup
  rm -f "$TEMP_FILE" "$TEST_SCRIPT"
fi

################################################################################
# Monitor Results
################################################################################

if [ "$TEST_TYPE" != "direct" ]; then
  print_header "Monitoring Results"

  print_info "Waiting for notification (30 seconds)..."
  sleep 30

  print_info "Check your Slack channel for notification"
  echo

  print_info "Expected notification format:"
  echo

  case $TEST_TYPE in
    success)
      cat <<EOF
🟢 Batch Job Completed Successfully

Job ID: [auto-generated]
Duration: [X] minutes
Projects Processed: [N]
Chats Analyzed: [N]
Knowledge Archived: [N]
Patterns Extracted:
  • Vocabulary: [N]
  • Structure: [N]
  • Emphasis: [N]
  • Tone: [N]
  • Length: [N]
EOF
      ;;

    error)
      cat <<EOF
🔴 Batch Job Failed

Job ID: [auto-generated]
Error: invalid-argument
Message: Invalid job type specified
EOF
      ;;

    warning)
      cat <<EOF
🟡 Batch Job Completed with Warnings

Job ID: [auto-generated]
Warning: No data found in specified period
Projects Processed: 0
Chats Analyzed: 0
EOF
      ;;
  esac

  echo

  # Check function logs
  print_info "Checking recent function logs..."
  echo

  firebase functions:log \
    --only triggerBatchJob,weeklyPatternExtraction \
    --project=$PROJECT_ID \
    --limit=20
fi

################################################################################
# Verification Checklist
################################################################################

print_header "Verification Checklist"

echo "Please verify the following:"
echo
echo "  [ ] Slack channel received notification"
echo "  [ ] Notification shows correct job type"
echo "  [ ] Notification shows correct status (success/error/warning)"
echo "  [ ] Notification includes relevant details"
echo "  [ ] Timestamp is accurate"
echo "  [ ] No errors in function logs"
echo

if [ "$TEST_TYPE" == "success" ]; then
  echo "Additional checks for success notification:"
  echo "  [ ] Job statistics are displayed"
  echo "  [ ] Pattern extraction counts are shown"
  echo "  [ ] Duration is reasonable"
  echo
fi

################################################################################
# Troubleshooting
################################################################################

print_header "Troubleshooting"

echo "If notification was NOT received:"
echo
echo "  1. Verify webhook URL is correct:"
echo "     firebase functions:config:get slack.webhook_url --project=$PROJECT_ID"
echo
echo "  2. Check function logs for errors:"
echo "     firebase functions:log --only triggerBatchJob --project=$PROJECT_ID"
echo
echo "  3. Test webhook URL directly:"
echo "     curl -X POST [WEBHOOK_URL] -H 'Content-Type: application/json' \\"
echo "       -d '{\"text\":\"Test message\"}'"
echo
echo "  4. Verify Slack webhook is active in Slack app settings"
echo
echo "  5. Check Cloud Functions deployment:"
echo "     firebase functions:list --project=$PROJECT_ID"
echo

################################################################################
# Summary
################################################################################

print_header "Test Summary"

print_success "Notification test completed"
echo
print_info "Next steps:"
echo "  1. Verify notification received in Slack"
echo "  2. Check notification formatting and content"
echo "  3. If issues found, review troubleshooting steps above"
echo "  4. Test other notification types (success/error/warning)"
echo "  5. Document any configuration changes needed"
echo

exit 0
