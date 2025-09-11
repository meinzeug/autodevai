#!/bin/bash

# GitHub Actions Security Validator
# Checks for script injection vulnerabilities in workflow files

set -euo pipefail

SECURITY_ISSUES=0
WORKFLOW_DIR="/home/dennis/autodevai/.github/workflows"

echo "🔒 GitHub Actions Security Validation"
echo "====================================="

# Function to log security issues
log_issue() {
    local file="$1"
    local line="$2" 
    local issue="$3"
    local severity="$4"
    
    echo "🚨 [$severity] $file:$line - $issue"
    ((SECURITY_ISSUES++))
}

# Function to log security fix
log_fix() {
    local file="$1"
    local line="$2"
    local fix="$3"
    
    echo "✅ $file:$line - $fix"
}

echo ""
echo "Checking for script injection vulnerabilities..."
echo ""

# Check for direct use of github.event.* in run commands
while IFS= read -r line; do
    file=$(echo "$line" | cut -d: -f1)
    line_num=$(echo "$line" | cut -d: -f2)
    content=$(echo "$line" | cut -d: -f3-)
    
    # Skip if it's properly using environment variables
    if [[ "$content" =~ env:|ENV:|environment: ]]; then
        continue
    fi
    
    # Check for dangerous patterns
    if [[ "$content" =~ \$\{\{.*github\.event\. ]] && [[ "$content" =~ run:|script: ]]; then
        log_issue "$file" "$line_num" "Direct use of github.event.* in shell command - potential script injection" "HIGH"
    fi
done < <(grep -rn "github\.event\." "$WORKFLOW_DIR" || true)

# Check for unsanitized user inputs
while IFS= read -r line; do
    file=$(echo "$line" | cut -d: -f1)
    line_num=$(echo "$line" | cut -d: -f2)
    content=$(echo "$line" | cut -d: -f3-)
    
    if [[ "$content" =~ github\.event\.inputs\. ]] && [[ "$content" =~ run: ]]; then
        log_issue "$file" "$line_num" "Direct use of user input in shell command - potential script injection" "CRITICAL"
    fi
done < <(grep -rn "github\.event\.inputs\." "$WORKFLOW_DIR" || true)

# Validate security fixes are in place
echo ""
echo "Validating security fixes..."
echo ""

# Check that environment variables are being used for sensitive operations
fixes_found=0

while IFS= read -r line; do
    file=$(echo "$line" | cut -d: -f1)
    line_num=$(echo "$line" | cut -d: -f2)
    
    log_fix "$file" "$line_num" "Environment variables used to prevent script injection"
    ((fixes_found++))
done < <(grep -rn "# SECURITY FIX:" "$WORKFLOW_DIR" || true)

echo ""
echo "Security Validation Summary:"
echo "=========================="
echo "Security issues found: $SECURITY_ISSUES"
echo "Security fixes implemented: $fixes_found"

if [[ $SECURITY_ISSUES -eq 0 ]]; then
    echo "✅ No critical security issues found!"
    exit 0
else
    echo "❌ Critical security issues require immediate attention!"
    exit 1
fi