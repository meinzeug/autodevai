#!/bin/bash
# GitHub Callback Server Auto-Start für MX Linux
# Startet webhook server mit korrekten Umgebungsvariablen

set -euo pipefail

LOG_FILE="/tmp/github-callback-autostart.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "🚀 GitHub Callback Server Auto-Start"

# Wait for network
sleep 5

# Source GitHub environment if available
if [ -f "/etc/environment.github" ]; then
    source /etc/environment.github
    log "✅ GitHub environment variables geladen"
else
    log "⚠️ /etc/environment.github nicht gefunden, lade aus secrets.env"
    # Fallback: Load directly from secrets
    if [ -f "/etc/neubri/secrets.env" ]; then
        export GITHUB_TOKEN=$(sudo cat /etc/neubri/secrets.env | grep "^GITHUB_TOKEN=" | cut -d'=' -f2- | tr -d '"' | xargs)
        log "✅ GITHUB_TOKEN aus secrets.env geladen (${#GITHUB_TOKEN} chars)"
    fi
fi

# Check if callback server is already running
if pgrep -f "github-callback-server.js" > /dev/null; then
    log "ℹ️ GitHub Callback Server läuft bereits"
    exit 0
fi

# Change to project directory
cd /home/dennis/autodevai

log "🌐 Starte GitHub Callback Server..."

# Set webhook secret from secrets file if available
if [ -f "/etc/neubri/secrets.env" ]; then
    export GITHUB_WEBHOOK_SECRET=$(sudo cat /etc/neubri/secrets.env | grep "^GITHUB_WEBHOOK_SECRET=" | cut -d'=' -f2- | tr -d '"' | xargs 2>/dev/null || echo "")
fi

# Start callback server as dennis user with environment
sudo -u dennis -E nohup /usr/bin/node /home/dennis/autodevai/github-callback-server.js > /tmp/github-callback-server.log 2>&1 &
SERVER_PID=$!

if [ -n "$SERVER_PID" ]; then
    echo "$SERVER_PID" > /tmp/github-callback-server.pid
    log "✅ GitHub Callback Server gestartet (PID: $SERVER_PID)"
    log "📡 Webhook URL: http://tekkfm.mooo.com:19000/githubisdone"
else
    log "❌ Fehler beim Starten des GitHub Callback Servers"
    exit 1
fi

# Wait a moment and verify it's running
sleep 3
if pgrep -f "github-callback-server.js" > /dev/null; then
    log "🎉 GitHub Callback Server erfolgreich gestartet und läuft"
    
    # Test health endpoint
    if curl -s -m 5 "http://localhost:19000/health" >/dev/null 2>&1; then
        log "✅ Health check erfolgreich - Server ist bereit"
    else
        log "⚠️ Health check fehlgeschlagen, aber Server läuft"
    fi
else
    log "❌ GitHub Callback Server konnte nicht gestartet werden"
    exit 1
fi