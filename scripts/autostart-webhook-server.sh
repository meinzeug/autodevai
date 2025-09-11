#!/bin/bash
# AutoStart Script für GitHub Webhook Server - MX Linux
# Wird beim Boot automatisch gestartet

# Logging
LOG_FILE="/tmp/github-callback-autostart.log"
echo "[$(date)] Starting GitHub Webhook Server..." >> "$LOG_FILE"

# Wait for network to be ready
sleep 10

# Check if already running
if pgrep -f "github-callback-server.js" > /dev/null; then
    echo "[$(date)] Webhook server already running" >> "$LOG_FILE"
    exit 0
fi

# Start the webhook server
cd /home/dennis/autodevai
sudo -u dennis nohup /usr/bin/node /home/dennis/autodevai/github-callback-server.js >> /tmp/github-callback-server.log 2>&1 &

echo "[$(date)] Webhook server started with PID: $!" >> "$LOG_FILE"