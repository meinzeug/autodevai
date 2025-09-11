#!/bin/bash
# Master Setup Script für AI Automation System
set -euo pipefail

echo "🤖 AutoDev-AI Automation Setup"
echo "==============================="
echo ""

# Check if running as correct user
if [ "$USER" != "dennis" ]; then
  echo "❌ This script must be run as user 'dennis'"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "📂 Project Directory: $PROJECT_DIR"
echo "🔧 Script Directory: $SCRIPT_DIR"
echo ""

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check Node.js
if ! command_exists node; then
  echo "❌ Node.js not found. Installing..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  echo "✅ Node.js found: $(node --version)"
fi

# Check GitHub CLI
if ! command_exists gh; then
  echo "❌ GitHub CLI not found. Installing..."
  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
  sudo apt update
  sudo apt install gh -y
else
  echo "✅ GitHub CLI found: $(gh --version | head -1)"
fi

# Check Claude Flow
if ! command_exists npx || ! npx claude-flow@alpha --version >/dev/null 2>&1; then
  echo "⚠️ Claude Flow not available, will be installed on first run"
else
  echo "✅ Claude Flow available"
fi

echo ""
echo "📦 Setting up Node.js dependencies..."
cd "$SCRIPT_DIR"
npm install

echo ""
echo "🔑 Setting up GitHub authentication..."
source github-auth-setup.sh
github_auth_setup

echo ""
echo "🌐 Setting up GitHub webhooks..."
chmod +x setup-github-webhooks.sh
./setup-github-webhooks.sh

echo ""
echo "🛠️ Setting up process manager..."
chmod +x ai-process-manager.sh

echo ""
echo "📋 Creating systemd service..."
sudo cp ai-webhook-server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable ai-webhook-server.service

echo ""
echo "🚀 Starting webhook server..."
sudo systemctl start ai-webhook-server.service

echo ""
echo "📊 Checking service status..."
sudo systemctl status ai-webhook-server.service --no-pager -l

echo ""
echo "🧪 Testing webhook server..."
sleep 3
curl -f http://localhost:3000/health || echo "⚠️ Health check failed"

echo ""
echo "🌍 Testing external access..."
curl -f http://tekkfm.mooo.com:3000/health || echo "⚠️ External access failed - check router port forwarding"

echo ""
echo "📝 Creating management aliases..."
cat >> ~/.bashrc << 'EOF'

# AI Automation Aliases
alias ai-start='/home/dennis/autodevai/scripts/ai-process-manager.sh start'
alias ai-stop='/home/dennis/autodevai/scripts/ai-process-manager.sh stop'
alias ai-restart='/home/dennis/autodevai/scripts/ai-process-manager.sh restart'
alias ai-status='/home/dennis/autodevai/scripts/ai-process-manager.sh status'
alias ai-logs='/home/dennis/autodevai/scripts/ai-process-manager.sh logs'
alias webhook-status='sudo systemctl status ai-webhook-server.service'
alias webhook-logs='sudo journalctl -f -u ai-webhook-server.service'
EOF

echo ""
echo "✅ Setup Complete!"
echo ""
echo "🎯 Available Commands:"
echo "  ai-start     - Start AI automation"
echo "  ai-stop      - Stop AI automation"
echo "  ai-restart   - Restart AI with next task"
echo "  ai-status    - Check AI status"
echo "  ai-logs      - View AI logs"
echo "  webhook-status - Check webhook server"
echo "  webhook-logs   - View webhook logs"
echo ""
echo "🚀 To start the automation:"
echo "  source ~/.bashrc"
echo "  ai-start"
echo ""
echo "🌐 Webhook URL: http://tekkfm.mooo.com:3000/github-webhook"
echo "❤️ Health Check: http://tekkfm.mooo.com:3000/health"
echo ""
echo "🔥 The system will now:"
echo "  1. Monitor your roadmap (docs/roadmap.md)"
echo "  2. Execute tasks with AI automatically"
echo "  3. Push to GitHub and wait for workflows"
echo "  4. Receive webhooks when workflows complete"
echo "  5. Restart AI with next task"
echo "  6. Repeat until roadmap complete"
echo ""
echo "🎉 Happy Automated Coding!"