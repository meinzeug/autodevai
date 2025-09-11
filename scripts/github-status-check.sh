#!/bin/bash

# GitHub Status Check Script
# Validates prerequisites before roadmap execution

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Status tracking
READY=true
ISSUES=()

# Check function
check() {
    local status=$1
    local message=$2
    
    if [ "$status" = "pass" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    else
        echo -e "${RED}❌ $message${NC}"
        READY=false
        ISSUES+=("$message")
    fi
}

# Warning function
warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "🔍 GitHub Status Check"
echo "════════════════════════════════════════"

# Check for open Dependabot PRs
echo ""
echo "📦 Checking Dependabot PRs..."
DEPENDABOT_PRS=$(gh pr list --label dependencies --state open --json number 2>/dev/null | jq length)
if [ "$DEPENDABOT_PRS" -eq 0 ]; then
    check "pass" "No open Dependabot PRs"
else
    check "fail" "$DEPENDABOT_PRS open Dependabot PRs found"
    gh pr list --label dependencies --state open --json number,title | jq -r '.[] | "  - PR #\(.number): \(.title)"'
fi

# Check for other open PRs targeting main
echo ""
echo "🔀 Checking other PRs targeting main..."
OTHER_PRS=$(gh pr list --base main --state open --json number | jq '. | map(select(.labels | map(.name) | contains(["dependencies"]) | not)) | length' 2>/dev/null || echo "0")
if [ "$OTHER_PRS" -eq 0 ]; then
    check "pass" "No other open PRs targeting main"
else
    check "fail" "$OTHER_PRS open PRs targeting main"
    gh pr list --base main --state open --json number,title | jq -r '.[] | "  - PR #\(.number): \(.title)"' | head -5
fi

# Check for security vulnerabilities (NPM)
echo ""
echo "🔒 Checking NPM security vulnerabilities..."
if [ -f "package.json" ]; then
    NPM_AUDIT=$(npm audit --audit-level=high 2>/dev/null | grep -E "found.*vulnerabilities" || echo "")
    if [ -z "$NPM_AUDIT" ]; then
        check "pass" "No high/critical NPM vulnerabilities"
    else
        check "fail" "NPM vulnerabilities detected: $NPM_AUDIT"
        npm audit --audit-level=high 2>/dev/null | grep -E "High|Critical" | head -5 || true
    fi
else
    warn "No package.json found, skipping NPM audit"
fi

# Check for security vulnerabilities (Cargo)
echo ""
echo "🦀 Checking Cargo security vulnerabilities..."
if [ -f "Cargo.toml" ] || [ -f "src-tauri/Cargo.toml" ]; then
    if command -v cargo-audit &> /dev/null; then
        CARGO_DIR=""
        if [ -f "src-tauri/Cargo.toml" ]; then
            CARGO_DIR="src-tauri"
        fi
        
        if [ -n "$CARGO_DIR" ]; then
            cd "$CARGO_DIR"
        fi
        
        if cargo audit 2>/dev/null | grep -q "Vulnerabilities"; then
            check "fail" "Cargo vulnerabilities detected"
            cargo audit 2>/dev/null | grep -A 5 "Vulnerabilities" || true
        else
            check "pass" "No Cargo vulnerabilities"
        fi
        
        if [ -n "$CARGO_DIR" ]; then
            cd - > /dev/null
        fi
    else
        warn "cargo-audit not installed, skipping Cargo audit"
    fi
else
    warn "No Cargo.toml found, skipping Cargo audit"
fi

# Check CI/CD status
echo ""
echo "🚀 Checking CI/CD status..."
LATEST_RUN=$(gh run list --limit 1 --json conclusion,status 2>/dev/null | jq -r '.[0]' || echo '{}')
if [ "$LATEST_RUN" != "{}" ]; then
    RUN_STATUS=$(echo "$LATEST_RUN" | jq -r '.status')
    RUN_CONCLUSION=$(echo "$LATEST_RUN" | jq -r '.conclusion')
    
    if [ "$RUN_STATUS" = "completed" ] && [ "$RUN_CONCLUSION" = "success" ]; then
        check "pass" "Latest CI/CD run successful"
    elif [ "$RUN_STATUS" = "in_progress" ] || [ "$RUN_STATUS" = "queued" ]; then
        warn "CI/CD run in progress (status: $RUN_STATUS)"
    else
        check "fail" "Latest CI/CD run failed (conclusion: $RUN_CONCLUSION)"
    fi
else
    warn "No CI/CD runs found"
fi

# Check for open issues
echo ""
echo "📋 Checking open issues..."
OPEN_ISSUES=$(gh issue list --state open --label "bug,security,ci-failure" --json number 2>/dev/null | jq length || echo "0")
if [ "$OPEN_ISSUES" -eq 0 ]; then
    check "pass" "No critical open issues"
else
    warn "$OPEN_ISSUES critical issues open (non-blocking)"
    gh issue list --state open --label "bug,security,ci-failure" --json number,title | jq -r '.[] | "  - Issue #\(.number): \(.title)"' | head -3
fi

# Check if main branch is up-to-date
echo ""
echo "🔄 Checking main branch status..."
git fetch origin main &>/dev/null
LOCAL_MAIN=$(git rev-parse main 2>/dev/null)
REMOTE_MAIN=$(git rev-parse origin/main 2>/dev/null)

if [ "$LOCAL_MAIN" = "$REMOTE_MAIN" ]; then
    check "pass" "Main branch is up-to-date"
else
    BEHIND=$(git rev-list --count main..origin/main)
    AHEAD=$(git rev-list --count origin/main..main)
    
    if [ "$BEHIND" -gt 0 ]; then
        check "fail" "Main branch is $BEHIND commits behind origin"
    elif [ "$AHEAD" -gt 0 ]; then
        warn "Main branch is $AHEAD commits ahead of origin"
    fi
fi

# Final status report
echo ""
echo "════════════════════════════════════════"
echo "📊 STATUS SUMMARY"
echo "════════════════════════════════════════"

if [ "$READY" = true ]; then
    echo -e "${GREEN}✅ ALL PREREQUISITES MET${NC}"
    echo "Ready for roadmap execution!"
    exit 0
else
    echo -e "${RED}❌ PREREQUISITES NOT MET${NC}"
    echo ""
    echo "Issues found:"
    for issue in "${ISSUES[@]}"; do
        echo "  - $issue"
    done
    echo ""
    echo "Fix these issues before proceeding with roadmap execution."
    exit 1
fi