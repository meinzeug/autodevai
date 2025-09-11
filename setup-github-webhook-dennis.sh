#!/bin/bash
# GitHub Webhook Setup für dennis auf Port 19000
set -euo pipefail

echo "🔗 Setting up GitHub Webhooks für dennis automation..."

REPO="meinzeug/autodevai"
SECRET_PARAM="32543h5hk34h6jk46jk35325up3258958p3496b897p884378p8672b6t43784ztv4huhrjdlf53578934vntp84v89p64b6p845o854n"
WEBHOOK_URL="http://tekkfm.mooo.com:19000/githubisdone?secret=${SECRET_PARAM}"

# Generate webhook secret
WEBHOOK_SECRET=$(openssl rand -hex 32)
echo "GITHUB_WEBHOOK_SECRET=$WEBHOOK_SECRET" >> /home/dennis/autodevai/.env.dennis

# Ensure GitHub authentication
source /home/dennis/autodevai/scripts/github-auth-setup.sh
github_auth_setup

echo "📡 Creating webhook for: $WEBHOOK_URL"

# Delete existing webhook if exists (cleanup)
echo "🧹 Removing old webhooks..."
gh api repos/$REPO/hooks --jq '.[].id' | while read hook_id; do
  if [ -n "$hook_id" ]; then
    gh api repos/$REPO/hooks/$hook_id -X DELETE || true
    echo "   Deleted webhook ID: $hook_id"
  fi
done

# Create new webhook for workflow completion
gh api repos/$REPO/hooks -X POST \
  --field name=web \
  --field active=true \
  --field "config[url]=$WEBHOOK_URL" \
  --field "config[content_type]=json" \
  --field "config[secret]=$WEBHOOK_SECRET" \
  --field "config[insecure_ssl]=0" \
  --field "events[]=workflow_run" \
  --field "events[]=push" \
  --field "events[]=workflow_job"

echo ""
echo "✅ GitHub Webhook erfolgreich erstellt!"
echo "📡 Webhook URL: $WEBHOOK_URL"
echo "🔐 Secret gespeichert in: /home/dennis/autodevai/.env.dennis"
echo ""
echo "🚨 WICHTIG: Stelle sicher dass Router Port 19000 weiterleitet:"
echo "   Externe Adresse: tekkfm.mooo.com:19000"
echo "   Interne Adresse: [deine PC IP]:19000"
echo ""
echo "🧪 Test Webhook:"
echo "   curl -X POST http://tekkfm.mooo.com:19000/health"
echo ""
echo "📊 Webhook Events:"
echo "   - workflow_run: Wird getriggert wenn Workflows abgeschlossen sind"
echo "   - push: Wird getriggert bei Git pushes"
echo "   - workflow_job: Wird getriggert bei Job-Status-Änderungen"
echo ""
echo "🔄 Automation Flow:"
echo "   1. AI pushed Code"
echo "   2. GitHub Workflows laufen"
echo "   3. Webhook kommt zu tekkfm.mooo.com:19000/githubisdone"
echo "   4. Lokaler Server killt claude und startet /home/dennis/autodevai/startgit.sh"
echo "   5. Loop continues..."