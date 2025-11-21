#!/bin/bash
# Setup Environment Variables for Firebase Functions

set -e

echo "=========================================="
echo "Firebase Functions - Environment Setup"
echo "=========================================="
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Error: Firebase CLI is not installed"
    echo "Install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ Error: Not logged in to Firebase"
    echo "Run: firebase login"
    exit 1
fi

echo "✅ Firebase CLI is ready"
echo ""

# Function to set Firebase config
set_config() {
    local key=$1
    local value=$2
    local description=$3
    
    if [ -z "$value" ] || [ "$value" == "your_"*"_here" ]; then
        echo "⚠️  Skipping $key (not set)"
        return
    fi
    
    echo "Setting $key..."
    firebase functions:config:set "$key=$value" > /dev/null 2>&1
    echo "✅ $description"
}

# Prompt for API keys
echo "Enter your API keys (press Enter to skip):"
echo ""

read -p "Claude API Key: " CLAUDE_API_KEY
read -p "Voyage AI API Key: " VOYAGE_API_KEY
read -p "Alert Email (optional): " ALERT_EMAIL
read -p "Slack Webhook URL (optional): " SLACK_WEBHOOK

echo ""
echo "Setting Firebase Functions configuration..."
echo ""

# Set Claude API configuration
if [ ! -z "$CLAUDE_API_KEY" ]; then
    set_config "claude.api_key" "$CLAUDE_API_KEY" "Claude API Key"
    set_config "claude.model" "claude-3-5-sonnet-20241022" "Claude Model"
fi

# Set Voyage AI configuration
if [ ! -z "$VOYAGE_API_KEY" ]; then
    set_config "voyage.api_key" "$VOYAGE_API_KEY" "Voyage AI API Key"
    set_config "voyage.model" "voyage-3" "Voyage AI Model"
fi

# Set error handling configuration
set_config "error.rate_threshold_degraded" "0.10" "Error Rate Threshold (Degraded)"
set_config "error.rate_threshold_down" "0.50" "Error Rate Threshold (Down)"
set_config "error.response_time_degraded" "5000" "Response Time Threshold (Degraded)"
set_config "error.response_time_down" "10000" "Response Time Threshold (Down)"

# Set health check configuration
set_config "health.check_interval_minutes" "5" "Health Check Interval"
set_config "health.retention_hours" "168" "Health Check Retention"

# Set retry configuration
set_config "retry.max_attempts" "5" "Max Retry Attempts"
set_config "retry.base_delay_ms" "1000" "Retry Base Delay"
set_config "retry.max_delay_ms" "30000" "Retry Max Delay"

# Set circuit breaker configuration
set_config "circuit.failure_threshold" "5" "Circuit Breaker Failure Threshold"
set_config "circuit.reset_timeout_ms" "60000" "Circuit Breaker Reset Timeout"

# Set rate limit configuration
set_config "rate_limit.rpm" "50" "Rate Limit RPM"
set_config "rate_limit.tpm" "40000" "Rate Limit TPM"
set_config "rate_limit.rpd" "50000" "Rate Limit RPD"

# Set alert configuration (optional)
if [ ! -z "$ALERT_EMAIL" ]; then
    set_config "alert.email" "$ALERT_EMAIL" "Alert Email"
fi

if [ ! -z "$SLACK_WEBHOOK" ]; then
    set_config "alert.slack_webhook" "$SLACK_WEBHOOK" "Slack Webhook URL"
fi

echo ""
echo "=========================================="
echo "Configuration Summary"
echo "=========================================="
firebase functions:config:get
echo ""
echo "✅ Environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Deploy Firestore indexes: firebase deploy --only firestore:indexes"
echo "2. Deploy Cloud Functions: firebase deploy --only functions"
echo "3. Verify health checks: firebase functions:log --only scheduledHealthCheck"
