#!/bin/bash

# GitHub Authentication Script - Emergency Fix
# Set GITHUB_TOKEN environment variable before running this script
# export GITHUB_TOKEN="your_token_here"
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ Error: GITHUB_TOKEN not set"
    echo "Please set: export GITHUB_TOKEN='your_token_here'"
    exit 1
fi
export GH_TOKEN="$GITHUB_TOKEN"

echo "✅ GitHub token loaded: ${#GITHUB_TOKEN} characters"
echo "🔑 Authentication ready for GitHub API calls"

# Test authentication
if gh api user --silent 2>/dev/null; then
    echo "✅ GitHub CLI authentication successful"
    USER=$(gh api user --jq '.login')
    echo "👤 Authenticated as: $USER"
else
    echo "❌ Authentication failed"
    exit 1
fi