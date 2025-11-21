#!/bin/bash
# Deployment Verification Script

set -e

echo "=========================================="
echo "   ET-AI Deployment Verification"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_command() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${RED}✗${NC} $1"
        return 1
    fi
}

echo "1. Checking Firebase CLI..."
if command -v firebase &> /dev/null; then
    FIREBASE_VERSION=$(firebase --version)
    check_command "Firebase CLI installed ($FIREBASE_VERSION)"
else
    echo -e "${RED}✗${NC} Firebase CLI not found"
    exit 1
fi
echo ""

echo "2. Checking Firebase login..."
if firebase projects:list &> /dev/null; then
    check_command "Logged in to Firebase"
else
    echo -e "${RED}✗${NC} Not logged in. Run: firebase login"
    exit 1
fi
echo ""

echo "3. Checking current project..."
PROJECT=$(firebase use 2>&1 | grep "Active Project" | awk '{print $3}' | tr -d '()')
if [ -z "$PROJECT" ]; then
    echo -e "${YELLOW}⚠${NC} No active project. Run: firebase use <project-id>"
else
    check_command "Active project: $PROJECT"
fi
echo ""

echo "4. Validating Firestore indexes..."
if [ -f "firestore.indexes.json" ]; then
    if cat firestore.indexes.json | jq . > /dev/null 2>&1; then
        INDEX_COUNT=$(cat firestore.indexes.json | jq '.indexes | length')
        check_command "Firestore indexes valid ($INDEX_COUNT indexes)"
    else
        echo -e "${RED}✗${NC} Invalid firestore.indexes.json"
        exit 1
    fi
else
    echo -e "${RED}✗${NC} firestore.indexes.json not found"
    exit 1
fi
echo ""

echo "5. Validating Cloud Functions..."
if [ -d "functions" ]; then
    check_command "Functions directory exists"
    
    cd functions
    
    if [ -f "package.json" ]; then
        check_command "package.json exists"
    else
        echo -e "${RED}✗${NC} package.json not found"
        exit 1
    fi
    
    echo "   Building TypeScript..."
    if npm run build > /dev/null 2>&1; then
        check_command "TypeScript compilation successful"
    else
        echo -e "${RED}✗${NC} TypeScript compilation failed"
        npm run build
        exit 1
    fi
    
    cd ..
else
    echo -e "${RED}✗${NC} functions directory not found"
    exit 1
fi
echo ""

echo "6. Checking Phase 4 files..."
PHASE4_FILES=(
    "functions/src/services/errorHandler.ts"
    "functions/src/utils/retryStrategy.ts"
    "functions/src/services/healthCheckService.ts"
    "docs/FAULT_TOLERANCE_DESIGN.md"
    "docs/PHASE4_DEPLOYMENT_TEST.md"
)

for file in "${PHASE4_FILES[@]}"; do
    if [ -f "$file" ]; then
        check_command "$file exists"
    else
        echo -e "${YELLOW}⚠${NC} $file not found"
    fi
done
echo ""

echo "7. Checking environment configuration..."
firebase functions:config:get > /tmp/firebase-config.json 2>&1
if [ -s /tmp/firebase-config.json ]; then
    if cat /tmp/firebase-config.json | jq . > /dev/null 2>&1; then
        check_command "Functions config accessible"
        
        if cat /tmp/firebase-config.json | jq -e '.claude.api_key' > /dev/null 2>&1; then
            check_command "Claude API key configured"
        else
            echo -e "${YELLOW}⚠${NC} Claude API key not configured"
        fi
        
        if cat /tmp/firebase-config.json | jq -e '.voyage.api_key' > /dev/null 2>&1; then
            check_command "Voyage AI API key configured"
        else
            echo -e "${YELLOW}⚠${NC} Voyage AI API key not configured"
        fi
    fi
else
    echo -e "${YELLOW}⚠${NC} No functions config found"
fi
rm -f /tmp/firebase-config.json
echo ""

echo "=========================================="
echo "   Verification Complete"
echo "=========================================="
echo ""

echo "Next steps:"
echo "1. Deploy Firestore indexes:"
echo "   ${GREEN}firebase deploy --only firestore:indexes${NC}"
echo ""
echo "2. Deploy Cloud Functions:"
echo "   ${GREEN}firebase deploy --only functions${NC}"
echo ""
echo "3. Monitor health:"
echo "   ${GREEN}firebase functions:log --only scheduledHealthCheck${NC}"
echo ""
