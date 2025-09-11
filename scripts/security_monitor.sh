#!/bin/bash

# Security Monitoring Dashboard
# Continuous monitoring for autodevai security alert resolution

set -e

# GitHub token must be set as environment variable
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ Error: GITHUB_TOKEN not set"
    echo "Please set: export GITHUB_TOKEN='your_token_here'"
    exit 1
fi
REPO="meinzeug/autodevai"
LOG_FILE="security_monitoring.log"
ALERT_BASELINE=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Timestamp function
timestamp() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')]"
}

# Log function
log() {
    echo "$(timestamp) $1" | tee -a $LOG_FILE
}

# Check security alerts count
check_security_alerts() {
    local count=$(GITHUB_TOKEN="$GITHUB_TOKEN" gh api repos/$REPO/code-scanning/alerts --jq 'length' 2>/dev/null || echo "ERROR")
    echo $count
}

# Check Dependabot status  
check_dependabot_alerts() {
    local result=$(GITHUB_TOKEN="$GITHUB_TOKEN" gh api repos/$REPO/dependabot/alerts --jq 'length' 2>/dev/null || echo "DISABLED")
    echo $result
}

# Get security configuration
check_security_config() {
    GITHUB_TOKEN="$GITHUB_TOKEN" gh api repos/$REPO --jq '.security_and_analysis'
}

# Real-time monitoring function
start_monitoring() {
    echo -e "${BLUE}🔐 SECURITY MONITORING DASHBOARD${NC}"
    echo -e "${BLUE}================================${NC}"
    echo -e "Repository: ${YELLOW}$REPO${NC}"
    echo -e "Baseline Alerts: ${RED}$ALERT_BASELINE${NC}"
    echo -e "Target: ${GREEN}0${NC}"
    echo ""

    local current_alerts=$(check_security_alerts)
    local last_count=$current_alerts
    local fixes_applied=0
    local monitoring_start=$(date +%s)

    log "Security monitoring started - Current alerts: $current_alerts"

    while true; do
        current_alerts=$(check_security_alerts)
        
        if [[ "$current_alerts" != "ERROR" ]]; then
            # Calculate progress
            local fixed_count=$((ALERT_BASELINE - current_alerts))
            local progress_percent=$(( (fixed_count * 100) / ALERT_BASELINE ))
            
            # Display status
            clear
            echo -e "${BLUE}🔐 SECURITY MONITORING DASHBOARD${NC}"
            echo -e "${BLUE}================================${NC}"
            echo -e "Repository: ${YELLOW}$REPO${NC}"
            echo -e "Monitoring Time: $(( ($(date +%s) - monitoring_start) / 60 )) minutes"
            echo ""
            
            if [[ $current_alerts -eq 0 ]]; then
                echo -e "${GREEN}✅ SUCCESS: All security alerts resolved!${NC}"
                echo -e "${GREEN}🎉 Mission Complete: $ALERT_BASELINE → 0 alerts${NC}"
                log "SUCCESS: All security alerts resolved! Total fixes: $fixed_count"
                break
            else
                echo -e "Current Alerts: ${RED}$current_alerts${NC}"
                echo -e "Fixed Alerts: ${GREEN}$fixed_count${NC}"
                echo -e "Progress: ${YELLOW}$progress_percent%${NC}"
                echo -e "Remaining: ${RED}$current_alerts${NC}"
            fi
            
            # Check if alerts decreased
            if [[ $current_alerts -lt $last_count ]]; then
                local new_fixes=$((last_count - current_alerts))
                fixes_applied=$((fixes_applied + new_fixes))
                log "PROGRESS: $new_fixes alert(s) fixed. Total progress: $fixes_applied/$ALERT_BASELINE"
                
                # Progress report every 10 fixes
                if [[ $((fixes_applied % 10)) -eq 0 ]] && [[ $fixes_applied -gt 0 ]]; then
                    echo -e "${GREEN}📊 PROGRESS REPORT: $fixes_applied fixes completed${NC}"
                    log "MILESTONE: $fixes_applied fixes completed ($progress_percent% progress)"
                fi
                
                last_count=$current_alerts
            fi
            
            echo ""
            echo -e "${BLUE}Dependabot Status:${NC} $(check_dependabot_alerts)"
            echo ""
            echo -e "${YELLOW}Next check in 30 seconds...${NC}"
            
        else
            echo -e "${RED}ERROR: Unable to fetch security alerts${NC}"
            log "ERROR: Unable to fetch security alerts from GitHub API"
        fi
        
        sleep 30
    done
}

# Generate security report
generate_report() {
    local current_alerts=$(check_security_alerts)
    local dependabot_status=$(check_dependabot_alerts)
    
    echo -e "${BLUE}📋 SECURITY STATUS REPORT${NC}"
    echo -e "${BLUE}========================${NC}"
    echo -e "Timestamp: $(date)"
    echo -e "Repository: $REPO"
    echo -e "Security Alerts: $current_alerts"
    echo -e "Dependabot: $dependabot_status"
    echo ""
    
    if [[ $current_alerts -eq 0 ]]; then
        echo -e "${GREEN}✅ Repository is secure - Ready for roadmap execution${NC}"
    else
        echo -e "${RED}🚨 Security alerts active - Roadmap execution blocked${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}Security Configuration:${NC}"
    check_security_config
}

# Command handling
case "${1:-monitor}" in
    "monitor")
        start_monitoring
        ;;
    "status")
        generate_report
        ;;
    "count")
        echo "Security Alerts: $(check_security_alerts)"
        ;;
    "check")
        current=$(check_security_alerts)
        echo "Current alerts: $current"
        if [[ $current -eq 0 ]]; then
            echo "✅ Ready for roadmap execution"
            exit 0
        else
            echo "🚨 Security alerts active - roadmap blocked"
            exit 1
        fi
        ;;
    *)
        echo "Usage: $0 [monitor|status|count|check]"
        echo "  monitor - Start continuous monitoring"
        echo "  status  - Generate security report"
        echo "  count   - Show current alert count"
        echo "  check   - Quick status check (exit code 0 if ready)"
        ;;
esac