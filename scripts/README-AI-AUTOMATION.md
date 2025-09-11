# 🤖 AutoDev-AI Vollautomatisches System

## 🎯 System-Überblick

Dieses System erstellt eine **vollautomatische Entwicklungsschleife**:

```
📝 AI führt Prompt aus → 📤 Push zu GitHub → 
⚙️ Workflows laufen → 🔔 Webhook Callback → 
🔄 AI neu starten → 📋 Nächster Task...
```

## 🛠️ Installation & Setup

### 1. Einmaliges Setup

```bash
# Ins Projekt-Verzeichnis wechseln
cd /home/dennis/autodevai/scripts

# Setup ausführen (macht alles automatisch)
chmod +x setup-ai-automation.sh
./setup-ai-automation.sh
```

Das Setup macht:
- ✅ Node.js & Dependencies installieren
- ✅ GitHub CLI & Authentication
- ✅ Webhook Server konfigurieren 
- ✅ Systemd Service einrichten
- ✅ Port-Forwarding testen

### 2. Router Konfiguration

**WICHTIG**: Port-Forwarding einrichten!

```
Router Einstellungen:
- Externe Port: 3000
- Interne IP: [deine PC IP]  
- Interne Port: 3000
- Protokoll: TCP
```

Test: `curl http://tekkfm.mooo.com:3000/health`

### 3. System-Test

```bash
# Vollständigen Test durchführen
chmod +x test-automation-flow.sh
./test-automation-flow.sh
```

## 🚀 Verwendung

### Automation starten

```bash
# Nach Setup verfügbare Commands:
source ~/.bashrc

ai-start          # AI Automation starten
ai-status         # Status prüfen  
ai-logs           # AI Logs anzeigen
webhook-status    # Webhook Server Status
webhook-logs      # Webhook Logs anzeigen
```

### Das System arbeitet dann automatisch:

1. **AI startet** mit nächstem Task aus `docs/roadmap.md`
2. **AI arbeitet** Task ab (Code, Tests, Docs)
3. **AI pusht** zu GitHub
4. **GitHub Workflows** laufen automatisch
5. **Webhook** kommt bei Completion
6. **AI startet neu** mit nächstem Task
7. **Repeat** bis Roadmap komplett

## 🔧 System-Komponenten

### 📡 Webhook Server (`ai-automation-server.js`)
- Läuft permanent als systemd service
- Empfängt GitHub webhooks
- Managed AI Lifecycle
- Port: 3000

### 🤖 AI Process Manager (`ai-process-manager.sh`)
- Startet/stoppt AI Prozesse
- Überwacht AI Health
- Retry-Logic bei Failures
- Roadmap Integration

### 🔗 GitHub Integration
- Webhook Events: `workflow_run`, `issues`, `push`
- Automatisches Issue Tracking
- PR Management
- Security Monitoring

## 📊 Monitoring

### Status Commands
```bash
# AI Status
ai-status

# Webhook Server
webhook-status
sudo systemctl status ai-webhook-server.service

# Live Logs
ai-logs
webhook-logs
```

### Log Files
- AI Logs: `/home/dennis/autodevai/logs/`
- Webhook Logs: `journalctl -u ai-webhook-server.service`
- Manager Logs: `/home/dennis/autodevai/logs/ai-manager.log`

## 🛡️ Fehlerbehandlung

### AI Process Failures
- **Auto-Retry**: Max 3x mit 10s Delay
- **Task Skip**: Bei wiederholten Fehlern
- **Logging**: Alle Fehler geloggt

### Webhook Failures
- **Signature Verification**: Schutz vor falschen Webhooks
- **Auto-Restart**: Systemd restart bei Crashes
- **Rate Limiting**: Schutz vor Spam

### Network Issues
- **Timeout Handling**: Robuste API Calls
- **Fallback Logic**: Mehrere Auth-Methoden
- **Health Checks**: Regelmäßige System-Validierung

## 🔄 Workflow Integration

### Supported GitHub Events
```javascript
workflow_run: {
  types: ['completed']  // Workflow fertig
}

issues: {
  types: ['opened']     // Neue Issues durch CI Failures  
}

push: {
  types: ['push']       // Code Updates → neue Workflows
}
```

### Workflow Status Tracking
- ✅ **In Progress**: Webhook Server wartet
- ✅ **Completed**: AI restart trigger
- ✅ **Failed**: Issues werden automatisch behandelt

## 📋 Roadmap Format

Das System liest `docs/roadmap.md` und arbeitet Tasks ab:

```markdown
## Phase 1: Setup
- [x] Completed task
- [ ] Next task to execute  ← AI nimmt diesen
- [ ] Future task
- [~] Skipped task (after failures)
```

## 🎛️ Konfiguration

### Environment Variables (`.env.local`)
```bash
WEBHOOK_SECRET=generated_secret
GITHUB_TOKEN=loaded_from_secrets
PORT=3000
AI_MODE=automated
```

### AI Process Limits
```bash
MAX_RETRIES=3         # Max retry attempts
RETRY_DELAY=10        # Delay between retries (seconds)  
AI_LOG_RETENTION=30   # Days to keep logs
```

## 🚨 Troubleshooting

### Häufige Probleme

#### 1. Webhook nicht erreichbar
```bash
# Port-Forwarding prüfen
curl http://tekkfm.mooo.com:3000/health

# Router Einstellungen überprüfen
# Firewall prüfen: sudo ufw status
```

#### 2. AI startet nicht
```bash
# Status prüfen
ai-status

# Logs prüfen  
ai-logs

# Manual restart
ai-restart
```

#### 3. GitHub Auth Probleme
```bash
# Auth neu setup
source scripts/github-auth-setup.sh
github_auth_setup

# Token prüfen
gh auth status
```

#### 4. Workflows hängen
```bash
# Aktuelle Workflows prüfen
gh run list --limit 10

# Pending workflows manual check
webhook-logs
```

### Emergency Commands
```bash
# System komplett stoppen
sudo systemctl stop ai-webhook-server.service
ai-stop force

# System neu starten  
sudo systemctl restart ai-webhook-server.service
ai-start

# Logs cleanen
rm -rf /home/dennis/autodevai/logs/*
```

## 🎉 Success Indicators

System läuft erfolgreich wenn:

- ✅ `ai-status` zeigt "running"
- ✅ `webhook-status` zeigt "active (running)"
- ✅ `curl http://tekkfm.mooo.com:3000/health` erfolgreich
- ✅ GitHub webhooks werden empfangen (webhook-logs)
- ✅ Tasks werden automatisch abgearbeitet

## 🔥 Pro-Tipps

1. **Monitoring Dashboard**: `watch -n 5 'ai-status && echo && webhook-status'`

2. **Manual Task**: `ai-start "Specific task description"`

3. **Debug Mode**: Setze `AI_DEBUG=true` in `.env.local`

4. **Backup**: Das System committet alle Änderungen automatisch

5. **Scaling**: Mehrere AI-Instanzen durch verschiedene Ports möglich

---

## 🎯 Das war's! 

Dein System läuft jetzt vollautomatisch und arbeitet deine Roadmap ab, bis alles erledigt ist. 

**Happy Automated Coding! 🚀**