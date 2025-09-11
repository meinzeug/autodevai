#!/bin/bash
# Master Setup für dennis AI Automation System
set -euo pipefail

echo "🤖 DENNIS AI AUTOMATION SETUP"
echo "============================="
echo "$(date) - Starting complete setup..."
echo ""

# Check if running as correct user
if [ "$USER" != "dennis" ]; then
  echo "❌ This script must be run as user 'dennis'"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📂 Working Directory: $SCRIPT_DIR"
echo ""

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

echo "🔍 Checking prerequisites..."

# Check Node.js
if ! command_exists node; then
  echo "📦 Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  echo "✅ Node.js found: $(node --version)"
fi

# Check GitHub CLI
if ! command_exists gh; then
  echo "📦 Installing GitHub CLI..."
  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
  sudo apt update
  sudo apt install gh -y
else
  echo "✅ GitHub CLI found: $(gh --version | head -1)"
fi

# Verify dennis has sudo without password
echo "🔍 Checking dennis sudo privileges..."
if sudo -n true 2>/dev/null; then
  echo "✅ dennis has sudo without password"
else
  echo "⚠️ dennis needs sudo without password. Setting up..."
  echo "dennis ALL=(ALL) NOPASSWD:ALL" | sudo tee /etc/sudoers.d/dennis
  echo "✅ sudo without password configured for dennis"
fi

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
cd "$SCRIPT_DIR"
if [ ! -f package.json ]; then
  cat > package.json << 'EOF'
{
  "name": "dennis-automation",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2"
  }
}
EOF
fi
npm install

echo ""
echo "🔑 Setting up GitHub authentication..."
source scripts/github-auth-setup.sh 2>/dev/null || source github-auth-setup.sh
github_auth_setup

echo ""
echo "🌐 Setting up GitHub webhooks..."
chmod +x setup-github-webhook-dennis.sh
./setup-github-webhook-dennis.sh

echo ""
echo "🛠️ Setting up MX Linux service (SysV Init)..."
# MX Linux nutzt SysV Init statt systemd
sudo cp github-callback-init.sh /etc/init.d/github-callback
sudo chmod +x /etc/init.d/github-callback
sudo update-rc.d github-callback defaults

echo ""
echo "🔧 Setting up scripts..."
chmod +x startgit.sh
chmod +x github-callback-server.js

echo ""
echo "🚀 Starting callback server..."
sudo service github-callback start

echo ""
echo "📊 Checking service status..."
sleep 2
sudo service github-callback status || echo "Service status check failed"

echo ""
echo "🧪 Testing local connection..."
sleep 3
curl -f http://localhost:19000/health || echo "⚠️ Local health check failed"

echo ""
echo "🌍 Testing external connection..."
curl -f http://tekkfm.mooo.com:19000/health || echo "⚠️ External access failed - check router port forwarding"

echo ""
echo "📝 Creating management aliases..."
cat >> ~/.bashrc << 'EOF'

# Dennis AI Automation Aliases (MX Linux)
alias ai-callback-status='sudo service github-callback status'
alias ai-callback-logs='sudo tail -f /var/log/github-callback.log'
alias ai-callback-restart='sudo service github-callback restart'
alias ai-start-manual='/home/dennis/autodevai/startgit.sh'
alias ai-kill='sudo killall claude'
alias ai-status='ps aux | grep claude'
EOF

echo ""
echo "✅ SETUP COMPLETE!"
echo ""
echo "🎯 Available Commands (MX Linux):"
echo "  ai-callback-status   - Check callback server status"
echo "  ai-callback-logs     - View callback server logs"  
echo "  ai-callback-restart  - Restart callback server"
echo "  ai-start-manual      - Manually start AI"
echo "  ai-kill              - Kill running claude processes"
echo "  ai-status            - Show claude process status"
echo ""
echo "🌐 Callback Server:"
echo "  URL: http://tekkfm.mooo.com:19000/githubisdone"
echo "  Health: http://tekkfm.mooo.com:19000/health"
echo "  Status: http://tekkfm.mooo.com:19000/status"
echo ""
echo "🔥 AUTOMATION FLOW:"
echo "  1. Manuell starten: ai-start-manual"
echo "  2. AI arbeitet Issues/PRs/Roadmap ab"
echo "  3. AI pushed erst am Ende"
echo "  4. GitHub workflows laufen"
echo "  5. Webhook kommt zu Port 19000"
echo "  6. Server killt claude und startet neu"
echo "  7. Loop continues..."
echo ""
echo "🚨 WICHTIG: Router Port-Forwarding für Port 19000 einrichten!"
echo "🎉 Happy Automated Coding with tekkadmin!"