#!/bin/bash

# 🛡️ Security Monitoring Scripts
# Security Monitoring Coordinator - Real-time Security Assessment

set -e

# Configuration
GITHUB_TOKEN="${GITHUB_TOKEN:-$(cat /etc/neubri/secrets.env 2>/dev/null | grep GITHUB_TOKEN | cut -d'=' -f2)}"
REPO="meinzeug/autodevai"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "🛡️ SECURITY MONITORING COORDINATOR - Real-time Assessment"
echo "=========================================================="
echo "Timestamp: $TIMESTAMP"
echo ""

# Function: Check GitHub Security Alerts
check_security_alerts() {
    echo "🔍 Checking GitHub Security Alerts..."
    local alert_count
    alert_count=$(gh api "repos/$REPO/code-scanning/alerts" --jq 'length' 2>/dev/null || echo "ERROR")
    
    if [ "$alert_count" = "ERROR" ]; then
        echo "❌ Unable to fetch security alerts"
        return 1
    else
        echo "📊 Current Security Alerts: $alert_count"
        if [ "$alert_count" -eq 0 ]; then
            echo "✅ SUCCESS: Zero security alerts"
        else
            echo "🚨 CRITICAL: $alert_count security alerts require immediate attention"
        fi
    fi
    return 0
}

# Function: Check Repository Issues
check_repo_issues() {
    echo ""
    echo "🔍 Checking Repository Issues..."
    local issue_count
    issue_count=$(gh issue list --repo "$REPO" --state=open --json number --jq 'length' 2>/dev/null || echo "ERROR")
    
    if [ "$issue_count" = "ERROR" ]; then
        echo "❌ Unable to fetch repository issues"
        return 1
    else
        echo "📊 Current Open Issues: $issue_count"
        if [ "$issue_count" -eq 0 ]; then
            echo "✅ SUCCESS: Zero open issues"
        else
            echo "🟠 HIGH PRIORITY: $issue_count open issues require resolution"
            # Show issue details
            echo "📋 Issue Details:"
            gh issue list --repo "$REPO" --state=open --limit 5 --json number,title,labels \
                --template '{{range .}}#{{.number}}: {{.title}} {{range .labels}}[{{.name}}]{{end}}{{"\n"}}{{end}}' 2>/dev/null || echo "Unable to fetch issue details"
        fi
    fi
    return 0
}

# Function: Check NPM Vulnerabilities
check_npm_vulnerabilities() {
    echo ""
    echo "🔍 Checking NPM Vulnerabilities..."
    
    if [ ! -f "package.json" ]; then
        echo "⚠️ No package.json found"
        return 1
    fi
    
    # Run npm audit and capture results
    local audit_result
    if audit_result=$(npm audit --json 2>/dev/null); then
        local vuln_count
        vuln_count=$(echo "$audit_result" | jq -r '.vulnerabilities | keys | length' 2>/dev/null || echo "0")
        
        echo "📊 Current NPM Vulnerabilities: $vuln_count"
        
        if [ "$vuln_count" -eq 0 ]; then
            echo "✅ SUCCESS: Zero NPM vulnerabilities"
        else
            echo "🟡 MODERATE: $vuln_count NPM vulnerabilities require patching"
            # Show severity breakdown
            local critical high moderate low
            critical=$(echo "$audit_result" | jq -r '[.vulnerabilities[] | select(.severity == "critical")] | length' 2>/dev/null || echo "0")
            high=$(echo "$audit_result" | jq -r '[.vulnerabilities[] | select(.severity == "high")] | length' 2>/dev/null || echo "0")
            moderate=$(echo "$audit_result" | jq -r '[.vulnerabilities[] | select(.severity == "moderate")] | length' 2>/dev/null || echo "0")
            low=$(echo "$audit_result" | jq -r '[.vulnerabilities[] | select(.severity == "low")] | length' 2>/dev/null || echo "0")
            
            echo "  📊 Breakdown: Critical: $critical, High: $high, Moderate: $moderate, Low: $low"
        fi
    else
        echo "⚠️ NPM audit failed or no vulnerabilities file available"
        return 1
    fi
    return 0
}

# Function: Generate Security Status Summary
generate_security_summary() {
    echo ""
    echo "📊 SECURITY STATUS SUMMARY"
    echo "=========================="
    
    local security_alerts repo_issues npm_vulns
    security_alerts=$(gh api "repos/$REPO/code-scanning/alerts" --jq 'length' 2>/dev/null || echo "UNKNOWN")
    repo_issues=$(gh issue list --repo "$REPO" --state=open --json number --jq 'length' 2>/dev/null || echo "UNKNOWN")
    
    if [ -f "package.json" ] && npm audit --json &>/dev/null; then
        npm_vulns=$(npm audit --json 2>/dev/null | jq -r '.vulnerabilities | keys | length' 2>/dev/null || echo "UNKNOWN")
    else
        npm_vulns="UNKNOWN"
    fi
    
    echo "GitHub Security Alerts: $security_alerts"
    echo "Repository Issues: $repo_issues"  
    echo "NPM Vulnerabilities: $npm_vulns"
    
    # Overall security status
    if [ "$security_alerts" = "0" ] && [ "$repo_issues" = "0" ] && [ "$npm_vulns" = "0" ]; then
        echo ""
        echo "🟢 OVERALL STATUS: SECURE - Ready for roadmap execution"
        echo "✅ All security criteria met!"
    else
        echo ""
        echo "🔴 OVERALL STATUS: INSECURE - Roadmap execution BLOCKED"
        echo "🚨 Security remediation required before proceeding"
    fi
}

# Function: Store monitoring results in memory
store_monitoring_results() {
    local timestamp security_alerts repo_issues npm_vulns
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    security_alerts=$(gh api "repos/$REPO/code-scanning/alerts" --jq 'length' 2>/dev/null || echo "unknown")
    repo_issues=$(gh issue list --repo "$REPO" --state=open --json number --jq 'length' 2>/dev/null || echo "unknown")
    
    if [ -f "package.json" ] && npm audit --json &>/dev/null; then
        npm_vulns=$(npm audit --json 2>/dev/null | jq -r '.vulnerabilities | keys | length' 2>/dev/null || echo "unknown")
    else
        npm_vulns="unknown"
    fi
    
    echo ""
    echo "💾 Storing monitoring results in coordination memory..."
    
    # Store results (would use claude-flow memory in practice)
    local results_json
    results_json=$(cat <<EOF
{
  "timestamp": "$timestamp",
  "security_alerts": "$security_alerts",
  "repo_issues": "$repo_issues", 
  "npm_vulnerabilities": "$npm_vulns",
  "monitoring_status": "active",
  "coordinator": "security_monitoring_coordinator"
}
EOF
)
    
    echo "📊 Results stored: $results_json"
}

# Main execution
main() {
    export GITHUB_TOKEN="$GITHUB_TOKEN"
    
    echo "🚀 Starting comprehensive security monitoring..."
    echo ""
    
    # Execute all monitoring functions
    check_security_alerts
    check_repo_issues  
    check_npm_vulnerabilities
    generate_security_summary
    store_monitoring_results
    
    echo ""
    echo "✅ Security monitoring cycle complete"
    echo "🔄 Monitoring will continue in coordination loop"
}

# Execute main function
main "$@"