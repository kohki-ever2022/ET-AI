#!/bin/bash
# Error Log Analysis Script

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

MINUTES=${1:-60}
LIMIT=${2:-50}

echo "=========================================="
echo "   Error Log Analysis"
echo "=========================================="
echo "Period: Last $MINUTES minutes"
echo "Limit: $LIMIT errors"
echo ""

echo "Fetching error logs from Firestore..."
echo ""

# Get recent error logs using Firebase CLI
firebase firestore:get error_logs \
    --orderBy timestamp desc \
    --limit $LIMIT \
    --pretty 2>/dev/null | \
    jq -r '.[] | 
        "\(.fields.timestamp.timestampValue // "N/A") | " +
        "\(.fields.service.stringValue // "N/A") | " +
        "\(.fields.errorType.stringValue // "N/A") | " +
        "\(.fields.severity.stringValue // "N/A") | " +
        "\(.fields.message.stringValue // "N/A") | " +
        "\(.fields.recovered.booleanValue // false)"' | \
    awk -F ' \\| ' '{
        timestamp=$1
        service=$2
        errorType=$3
        severity=$4
        message=$5
        recovered=$6
        
        # Color coding
        if (severity == "emergency") {
            severity_color="\033[1;31m"  # Bright red
        } else if (severity == "critical") {
            severity_color="\033[0;31m"  # Red
        } else if (severity == "warning") {
            severity_color="\033[1;33m"  # Yellow
        } else {
            severity_color="\033[0;37m"  # Gray
        }
        
        recovery_icon = (recovered == "true") ? "✓" : "✗"
        recovery_color = (recovered == "true") ? "\033[0;32m" : "\033[0;31m"
        
        printf "%s%-20s\033[0m %s%-12s\033[0m %s%-16s\033[0m %s%-10s\033[0m %s%-8s\033[0m %.60s\n", 
            "\033[0;36m", substr(timestamp, 12, 8),  # Time only
            "\033[0;37m", service,
            severity_color, severity,
            "\033[0;33m", errorType,
            recovery_color, recovery_icon,
            message
    }' | column -t -s $'\t'

echo ""
echo "=========================================="
echo "Summary Statistics"
echo "=========================================="

# Statistics
firebase firestore:get error_logs \
    --orderBy timestamp desc \
    --limit $LIMIT \
    --pretty 2>/dev/null | \
    jq -r '[.[] | {
        service: .fields.service.stringValue // "unknown",
        severity: .fields.severity.stringValue // "unknown",
        recovered: .fields.recovered.booleanValue // false
    }] | 
    {
        total: length,
        byService: (group_by(.service) | map({key: .[0].service, value: length}) | from_entries),
        bySeverity: (group_by(.severity) | map({key: .[0].severity, value: length}) | from_entries),
        recovered: (map(select(.recovered == true)) | length),
        failed: (map(select(.recovered == false)) | length)
    }' | \
    jq -r '
        "Total errors: \(.total)",
        "",
        "By Service:",
        (.byService | to_entries[] | "  \(.key): \(.value)"),
        "",
        "By Severity:",
        (.bySeverity | to_entries[] | "  \(.key): \(.value)"),
        "",
        "Recovery Rate:",
        "  Recovered: \(.recovered) (\((.recovered / .total * 100) | floor)%)",
        "  Failed: \(.failed) (\((.failed / .total * 100) | floor)%)"
    '

echo ""
echo "Legend:"
echo -e "  ${GREEN}✓${NC} = Recovered    ${RED}✗${NC} = Failed"
echo -e "  ${RED}emergency${NC} | ${RED}critical${NC} | ${YELLOW}warning${NC} | info"
echo ""

echo "Options:"
echo "  $0 <minutes> <limit>"
echo "  Example: $0 120 100  (last 2 hours, limit 100)"
echo ""
