#!/bin/bash
# GitHub Webhook Setup für Automated AI Loop
set -euo pipefail

REPO="meinzeug/autodevai"
WEBHOOK_URL="http://tekkfm.mooo.com:3000/github-webhook"
WEBHOOK_SECRET=$(openssl rand -hex 20)

echo "🔗 Setting up GitHub Webhooks for AI Automation..."

# Store webhook secret for later use
echo "WEBHOOK_SECRET=$WEBHOOK_SECRET" >> /home/dennis/autodevai/.env.local

# Create webhook for workflow events
gh api repos/$REPO/hooks -X POST \
  --field name=web \
  --field active=true \
  --field "config[url]=$WEBHOOK_URL" \
  --field "config[content_type]=json" \
  --field "config[secret]=$WEBHOOK_SECRET" \
  --field "config[insecure_ssl]=0" \
  --field "events[]=workflow_run" \
  --field "events[]=issues" \
  --field "events[]=pull_request" \
  --field "events[]=push"

echo "✅ Webhook created successfully!"
echo "📝 Webhook URL: $WEBHOOK_URL"
echo "🔐 Secret stored in .env.local"
echo ""
echo "🚨 IMPORTANT: Make sure your router forwards port 3000 to this machine!"
echo "🌐 Test webhook: curl http://tekkfm.mooo.com:3000/health"