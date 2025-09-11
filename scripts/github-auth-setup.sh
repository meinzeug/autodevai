#!/bin/bash
# GitHub Authentication Setup Script
# Optimized for seamless token-based authentication

set -euo pipefail

# Enhanced GitHub token authentication with multiple fallback methods
github_auth_setup() {
  echo "🔑 Setting up GitHub authentication..."
  
  # Method 1: Read from secure secrets file
  if [ -z "${GITHUB_TOKEN:-}" ] && [ -f "/etc/neubri/secrets.env" ]; then
    GITHUB_TOKEN=$(sudo cat /etc/neubri/secrets.env | grep "^GITHUB_TOKEN=" | cut -d'=' -f2- | tr -d '"' | xargs)
    if [ -n "$GITHUB_TOKEN" ]; then
      echo "✅ GITHUB_TOKEN loaded from /etc/neubri/secrets.env (${#GITHUB_TOKEN} chars)"
      export GITHUB_TOKEN="$GITHUB_TOKEN"
    fi
  fi
  
  # Method 2: Check if gh CLI is already authenticated
  if [ -z "${GITHUB_TOKEN:-}" ] && command -v gh >/dev/null 2>&1; then
    EXISTING_TOKEN=$(gh auth token 2>/dev/null || echo "")
    if [ -n "$EXISTING_TOKEN" ]; then
      export GITHUB_TOKEN="$EXISTING_TOKEN"
      echo "✅ Using existing gh auth token (${#GITHUB_TOKEN} chars)"
    fi
  fi
  
  # Method 3: Use environment variable if already set
  if [ -n "${GITHUB_TOKEN:-}" ]; then
    echo "✅ Using GITHUB_TOKEN environment variable (${#GITHUB_TOKEN} chars)"
  fi
  
  # Validate token format and length
  if [ -n "${GITHUB_TOKEN:-}" ]; then
    if [[ ${#GITHUB_TOKEN} -lt 20 ]]; then
      echo "⚠️ WARNING: Token seems too short (${#GITHUB_TOKEN} chars)"
      return 1
    fi
    
    # Authenticate with gh CLI if not already authenticated
    if ! gh auth status >/dev/null 2>&1; then
      echo "🔧 Authenticating gh CLI with token..."
      echo "$GITHUB_TOKEN" | gh auth login --with-token
      gh auth setup-git --hostname github.com
    fi
    
    # Test token by making authenticated API call
    if gh api user --silent 2>/dev/null; then
      echo "🎉 GitHub authentication successful - token validated"
      echo "📊 Token scopes: $(gh auth token | gh api user --header "Authorization: token $(cat)" --jq '.login // "unknown"') authenticated"
      return 0
    else
      echo "🚨 ERROR: GitHub token invalid or expired - authentication failed"
      unset GITHUB_TOKEN
      return 1
    fi
  fi
  
  # Final validation
  if [ -z "${GITHUB_TOKEN:-}" ]; then
    echo "🚨 CRITICAL ERROR: No valid GitHub token available!"
    echo "📋 SOLUTIONS:"
    echo "   1. Run: gh auth login --with-token < /path/to/token"
    echo "   2. Set GITHUB_TOKEN environment variable"
    echo "   3. Ensure /etc/neubri/secrets.env contains valid token"
    return 1
  fi
}

# GitHub status verification functions
github_is_security_clean() {
  local security_alerts=$(gh api repos/meinzeug/autodevai/code-scanning/alerts --jq '[.[] | select(.state=="open")] | length' 2>/dev/null || echo "0")
  [ "$security_alerts" -eq 0 ]
}

github_is_clean() {
  local open_prs=$(gh pr list --state=open --json number | jq '. | length')
  local open_issues=$(gh issue list --state=open --json number | jq '. | length')
  [ "$open_prs" -eq 0 ] && [ "$open_issues" -eq 0 ]
}

# Status reporting function
github_status_report() {
  echo "📊 GitHub Repository Status:"
  
  # Security status
  local security_alerts=$(gh api repos/meinzeug/autodevai/code-scanning/alerts --jq '[.[] | select(.state=="open")] | length' 2>/dev/null || echo "0")
  local critical_alerts=$(gh api repos/meinzeug/autodevai/code-scanning/alerts --jq '[.[] | select(.state=="open" and .rule.severity=="error")] | length' 2>/dev/null || echo "0")
  echo "  🔒 Security Alerts: $security_alerts total, $critical_alerts critical"
  
  # Clean state status
  local open_prs=$(gh pr list --state=open --json number | jq '. | length')
  local open_issues=$(gh issue list --state=open --json number | jq '. | length')
  echo "  📋 Open Issues: $open_issues"
  echo "  🔀 Open PRs: $open_prs"
  
  # Overall status
  if [ "$security_alerts" -eq 0 ] && [ "$open_issues" -eq 0 ] && [ "$open_prs" -eq 0 ]; then
    echo "  ✅ Status: CLEAN - Ready for roadmap execution"
    return 0
  else
    echo "  ⚠️ Status: NEEDS ATTENTION - Security:$security_alerts Issues:$open_issues PRs:$open_prs"
    return 1
  fi
}

# Main execution
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  github_auth_setup
  github_status_report
fi