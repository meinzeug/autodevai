#!/bin/bash
# GitHub Environment Setup für MX Linux SysVinit
# Lädt GitHub Token global beim Systemstart

set -euo pipefail

LOG_FILE="/tmp/github-env-setup.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | sudo tee -a "$LOG_FILE" > /dev/null
}

log "🔑 GitHub Environment Setup gestartet"

# Check if secrets file exists
if [ ! -f "/etc/neubri/secrets.env" ]; then
    log "❌ /etc/neubri/secrets.env nicht gefunden"
    exit 1
fi

# Load GitHub token from secrets
export GITHUB_TOKEN=$(sudo cat /etc/neubri/secrets.env | grep "^GITHUB_TOKEN=" | cut -d'=' -f2- | tr -d '"' | xargs)

if [ -z "$GITHUB_TOKEN" ]; then
    log "❌ GITHUB_TOKEN nicht in secrets.env gefunden"
    exit 1
fi

# Export global environment variables
log "✅ GitHub Token geladen (${#GITHUB_TOKEN} chars)"

# Create global environment file
sudo tee /etc/environment.github > /dev/null << EOF
# GitHub Environment Variables - Auto-generated $(date)
export GITHUB_TOKEN="$GITHUB_TOKEN"
export GITHUB_USER="meinzeug"
export GITHUB_REPO="autodevai"
EOF

# Make it readable by dennis
sudo chmod 644 /etc/environment.github
sudo chown root:dennis /etc/environment.github

# Source it in global profile
if ! grep -q "source /etc/environment.github" /etc/profile; then
    echo "source /etc/environment.github" | sudo tee -a /etc/profile
fi

# Add to dennis's bashrc if not present
if ! grep -q "source /etc/environment.github" /home/dennis/.bashrc; then
    echo "source /etc/environment.github" >> /home/dennis/.bashrc
fi

log "✅ GitHub Token global exportiert in /etc/environment.github"
log "✅ Auto-load in /etc/profile und ~/.bashrc konfiguriert"

# Test the setup
source /etc/environment.github
if [ -n "${GITHUB_TOKEN:-}" ]; then
    log "✅ GitHub Token erfolgreich geladen und verfügbar"
else
    log "❌ GitHub Token nach Setup nicht verfügbar"
    exit 1
fi

log "🎉 GitHub Environment Setup erfolgreich abgeschlossen"