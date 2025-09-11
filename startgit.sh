#!/bin/bash
# StartGit Script für dennis - Startet AI mit code_github.md prompt
set -euo pipefail

echo "🚀 AutoDev-AI Start Script für dennis"
echo "====================================="
echo "$(date '+%Y-%m-%d %H:%M:%S') - Starte AI Automation"

# Working directory
WORK_DIR="/home/dennis/autodevai"
cd "$WORK_DIR"

# Setup GitHub authentication
echo "🔑 GitHub Authentication Setup..."

  # Load secrets with proper sudo handling (dennis has passwordless sudo)
  SECRETS_CONTENT=$(sudo cat /etc/neubri/secrets.env 2>/dev/null || echo "")
  if [ -n "$SECRETS_CONTENT" ]; then
    export GITHUB_TOKEN=$(echo "$SECRETS_CONTENT" | grep "^GITHUB_TOKEN=" | cut -d'=' -f2- | tr -d '"' | xargs)
    export OPENROUTER_API_KEY=$(echo "$SECRETS_CONTENT" | grep "^OPENROUTER_API_KEY=" | cut -d'=' -f2- | tr -d '"' | xargs)
    echo "✅ GitHub Token loaded (${#GITHUB_TOKEN} chars)"
    echo "✅ OpenRouter API Key loaded (${#OPENROUTER_API_KEY} chars)"
  else
    echo "❌ Error: Could not read /etc/neubri/secrets.env with sudo"
    exit 1
  fi


# Ensure GitHub CLI is authenticated
if [ -n "${GITHUB_TOKEN:-}" ]; then
  echo "$GITHUB_TOKEN" | gh auth login --with-token || true
  gh auth setup-git --hostname github.com || true
fi

# Log the start
echo "$(date '+%Y-%m-%d %H:%M:%S') - AI Start: Automated execution via code_github.md" >> "/tmp/ai-automation.log"

echo "🤖 Starte Claude AI mit code_github.md prompt..."
echo "📍 Working Directory: $WORK_DIR"

# Set environment variables for the AI
export AI_MODE="automated"
export AI_USER="dennis"
export AI_START_TIME=$(date +%s)

# Check if deno is available (required for claude-flow)
if ! command -v deno &> /dev/null; then
  echo "📦 Installing Deno (required for claude-flow)..."
  curl -fsSL https://deno.land/install.sh | sh
  export PATH="$HOME/.deno/bin:$PATH"
fi

# Choose watchdog method
WATCHDOG_METHOD="${CLAUDE_WATCHDOG:-python}"  # Options: python, expect, none

# Execute the AI with watchdog protection
echo "📖 Starte Claude AI mit Watchdog ($WATCHDOG_METHOD)..."

# Log file with timestamp
LOG_FILE="/tmp/claude-ai-$(date +%Y%m%d-%H%M%S).log"

# Check for Python watchdog dependencies
if [ "$WATCHDOG_METHOD" = "python" ]; then
  if ! python3 -c "import pexpect" 2>/dev/null; then
    echo "📦 Installing pexpect for watchdog..."
    pip3 install --user pexpect || {
      echo "⚠️ Could not install pexpect, falling back to expect"
      WATCHDOG_METHOD="expect"
    }
  fi
fi

# Check for expect availability
if [ "$WATCHDOG_METHOD" = "expect" ]; then
  if ! command -v expect &> /dev/null; then
    echo "📦 Installing expect..."
    sudo apt-get update && sudo apt-get install -y expect || {
      echo "⚠️ Could not install expect, running without watchdog"
      WATCHDOG_METHOD="none"
    }
  fi
fi

# Start with appropriate method
case "$WATCHDOG_METHOD" in
  python)
    echo "🐍 Using Python watchdog with auto-resume..."
    python3 "$WORK_DIR/scripts/claude-watchdog.py" "$WORK_DIR/code_github.md" > "$LOG_FILE" 2>&1 &
    AI_PID=$!
    ;;
    
  expect)
    echo "🔄 Using Expect watchdog with auto-resume..."
    chmod +x "$WORK_DIR/scripts/claude-watchdog.expect"
    "$WORK_DIR/scripts/claude-watchdog.expect" "$WORK_DIR/code_github.md" > "$LOG_FILE" 2>&1 &
    AI_PID=$!
    ;;
    
  *)
    echo "⚠️ Running without watchdog (manual resume required)..."
    # Original claude-flow command as fallback
    npx claude-flow@alpha hive-mind spawn \
      "Read and execute the prompt in code_github.md. Work as dennis user with sudo powers. Push ONLY at the very end when everything is complete." \
      --agents 10 \
      --topology hierarchical \
      --strategy parallel \
      --claude \
      --auto-spawn > "$LOG_FILE" 2>&1 &
    AI_PID=$!
    ;;
esac

# Check if the process started successfully
sleep 2
if kill -0 "$AI_PID" 2>/dev/null; then
  echo "✅ Claude AI gestartet mit PID: $AI_PID"
  echo "📁 Logs: $LOG_FILE"
  
  # Store PID for later termination
  echo "$AI_PID" > "/tmp/claude-ai.pid"
  
  # Store automation mode flag
  echo "automated-via-prompt" > "/tmp/claude-ai-task.txt"
  
  echo "🎉 AI erfolgreich gestartet!"
  echo "📊 Status prüfen mit: ps aux | grep claude"
  echo "📋 Logs anzeigen mit: tail -f $LOG_FILE"
else
  echo "❌ Error: Claude AI konnte nicht gestartet werden"
  echo "📋 Check logs: cat $LOG_FILE"
  exit 1
fi
echo ""
echo "💡 Der AI-Prozess läuft jetzt und wird:"
echo "   1. GitHub Issues analysieren und beheben"
echo "   2. PRs mergen wo möglich"  
echo "   3. Roadmap Tasks abarbeiten"
echo "   4. Erst am Ende zu GitHub pushen"
echo "   5. Auf Webhook-Callback warten"
