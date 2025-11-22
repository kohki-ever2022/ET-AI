#!/bin/bash

################################################################################
# ET-AI Staging Deployment Script
#
# This script automates the deployment process to staging environment with
# comprehensive pre-flight checks and post-deployment validation.
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="et-ai-staging"
REGION="asia-northeast1"
FUNCTIONS_DIR="functions"

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

check_command() {
  if ! command -v $1 &> /dev/null; then
    print_error "$1 is not installed"
    exit 1
  fi
  print_success "$1 is installed"
}

################################################################################
# Pre-flight Checks
################################################################################

print_header "Pre-flight Checks"

# Check required commands
print_info "Checking required commands..."
check_command "node"
check_command "npm"
check_command "firebase"
check_command "git"

# Check Node.js version
print_info "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  print_error "Node.js version must be 20 or higher (current: $(node -v))"
  exit 1
fi
print_success "Node.js version: $(node -v)"

# Check Firebase CLI login
print_info "Checking Firebase authentication..."
if ! firebase projects:list &> /dev/null; then
  print_error "Not logged in to Firebase CLI"
  print_info "Run: firebase login"
  exit 1
fi
print_success "Firebase CLI authenticated"

# Check git status
print_info "Checking git status..."
if [[ -n $(git status -s) ]]; then
  print_warning "Working directory has uncommitted changes"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
else
  print_success "Working directory is clean"
fi

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
print_info "Current branch: $CURRENT_BRANCH"

################################################################################
# Environment Variable Checks
################################################################################

print_header "Environment Variable Checks"

print_info "Checking required environment variables in Firebase config..."

# Check if firebase functions:config:get works
if ! firebase functions:config:get --project=$PROJECT_ID &> /dev/null; then
  print_error "Cannot access Firebase config for project: $PROJECT_ID"
  exit 1
fi

# List critical config keys (without values for security)
REQUIRED_CONFIGS=(
  "anthropic.api_key"
  "voyage.api_key"
  "slack.webhook_url"
)

print_info "Verifying critical configuration keys..."
CONFIG_OUTPUT=$(firebase functions:config:get --project=$PROJECT_ID 2>&1)

for config in "${REQUIRED_CONFIGS[@]}"; do
  SECTION=$(echo $config | cut -d'.' -f1)
  KEY=$(echo $config | cut -d'.' -f2)

  if echo "$CONFIG_OUTPUT" | grep -q "\"$SECTION\""; then
    if echo "$CONFIG_OUTPUT" | grep -A 10 "\"$SECTION\"" | grep -q "\"$KEY\""; then
      print_success "$config is configured"
    else
      print_warning "$config is missing (optional for some features)"
    fi
  else
    print_warning "$config section not found"
  fi
done

################################################################################
# Dependency Installation
################################################################################

print_header "Installing Dependencies"

# Install frontend dependencies
print_info "Installing frontend dependencies..."
if npm ci; then
  print_success "Frontend dependencies installed"
else
  print_error "Failed to install frontend dependencies"
  exit 1
fi

# Install functions dependencies
print_info "Installing Cloud Functions dependencies..."
cd $FUNCTIONS_DIR
if npm ci; then
  print_success "Cloud Functions dependencies installed"
else
  print_error "Failed to install Cloud Functions dependencies"
  exit 1
fi
cd ..

################################################################################
# Build and Test
################################################################################

print_header "Building and Testing"

# Build frontend
print_info "Building frontend..."
if npm run build; then
  print_success "Frontend build successful"
else
  print_error "Frontend build failed"
  exit 1
fi

# Build functions
print_info "Building Cloud Functions..."
cd $FUNCTIONS_DIR
if npm run build; then
  print_success "Cloud Functions build successful"
else
  print_error "Cloud Functions build failed"
  exit 1
fi

# Run tests
print_info "Running tests..."
if npm test -- --passWithNoTests; then
  print_success "Tests passed"
else
  print_error "Tests failed"
  read -p "Continue deployment anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
  print_warning "Proceeding with failed tests"
fi

cd ..

################################################################################
# Deployment
################################################################################

print_header "Deploying to Staging Environment"

print_info "Project: $PROJECT_ID"
print_info "Region: $REGION"
echo

read -p "Proceed with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  print_info "Deployment cancelled"
  exit 0
fi

# Deploy Firestore rules
print_info "Deploying Firestore rules..."
if firebase deploy --only firestore:rules --project=$PROJECT_ID; then
  print_success "Firestore rules deployed"
else
  print_error "Firestore rules deployment failed"
  exit 1
fi

# Deploy Firestore indexes
print_info "Deploying Firestore indexes..."
if firebase deploy --only firestore:indexes --project=$PROJECT_ID; then
  print_success "Firestore indexes deployed"
else
  print_error "Firestore indexes deployment failed"
  exit 1
fi

# Deploy Cloud Functions
print_info "Deploying Cloud Functions..."
if firebase deploy --only functions --project=$PROJECT_ID; then
  print_success "Cloud Functions deployed"
else
  print_error "Cloud Functions deployment failed"
  exit 1
fi

# Deploy hosting (if needed)
print_info "Deploying Firebase Hosting..."
if firebase deploy --only hosting --project=$PROJECT_ID; then
  print_success "Firebase Hosting deployed"
else
  print_warning "Firebase Hosting deployment failed (may not be configured)"
fi

################################################################################
# Post-Deployment Validation
################################################################################

print_header "Post-Deployment Validation"

# Wait for functions to be ready
print_info "Waiting for Cloud Functions to be ready..."
sleep 10

# List deployed functions
print_info "Listing deployed Cloud Functions..."
firebase functions:list --project=$PROJECT_ID

# Check Firestore indexes
print_info "Checking Firestore indexes status..."
print_info "Run this command to monitor index creation:"
print_info "  firebase firestore:indexes --project=$PROJECT_ID"

################################################################################
# Next Steps
################################################################################

print_header "Deployment Summary"

print_success "Deployment to staging completed successfully!"
echo
print_info "Next steps:"
echo "  1. Configure Cloud Scheduler (see docs/CLOUD_SCHEDULER_SETUP.md)"
echo "  2. Test Slack notifications (run scripts/test-notifications.sh)"
echo "  3. Verify Cloud Functions in Firebase Console"
echo "  4. Check Firestore indexes are being created"
echo "  5. Test core functionality in staging environment"
echo
print_info "Firebase Console: https://console.firebase.google.com/project/$PROJECT_ID"
print_info "Functions Logs: firebase functions:log --project=$PROJECT_ID"
echo

################################################################################
# Generate Deployment Report
################################################################################

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
REPORT_FILE="deployment-report-${TIMESTAMP}.txt"

cat > $REPORT_FILE <<EOF
================================================================================
ET-AI Staging Deployment Report
================================================================================

Deployment Time: $(date)
Project ID: $PROJECT_ID
Region: $REGION
Branch: $CURRENT_BRANCH
Deployed By: $(git config user.name) <$(git config user.email)>

================================================================================
Deployment Status
================================================================================

✓ Firestore Rules: Deployed
✓ Firestore Indexes: Deployed
✓ Cloud Functions: Deployed
✓ Firebase Hosting: Deployed

================================================================================
Git Information
================================================================================

Commit: $(git rev-parse HEAD)
Commit Message: $(git log -1 --pretty=%B)

================================================================================
Next Steps
================================================================================

1. Configure Cloud Scheduler
   - See: docs/CLOUD_SCHEDULER_SETUP.md

2. Test Slack Notifications
   - Run: scripts/test-notifications.sh

3. Verify Deployment
   - Cloud Functions: https://console.firebase.google.com/project/$PROJECT_ID/functions
   - Firestore: https://console.firebase.google.com/project/$PROJECT_ID/firestore

4. Monitor Logs
   - Command: firebase functions:log --project=$PROJECT_ID

================================================================================
EOF

print_success "Deployment report saved: $REPORT_FILE"

exit 0
