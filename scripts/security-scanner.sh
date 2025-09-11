#!/bin/bash

# AutoDev-AI Security Scanner
# Comprehensive security scanning and automated fixing
# Usage: ./scripts/security-scanner.sh [--fix] [--report] [--json]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORTS_DIR="$PROJECT_ROOT/docs/security-reports"
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Options
FIX_MODE=false
REPORT_MODE=false
JSON_OUTPUT=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --fix)
            FIX_MODE=true
            shift
            ;;
        --report)
            REPORT_MODE=true
            shift
            ;;
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--fix] [--report] [--json]"
            exit 1
            ;;
    esac
done

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Initialize
setup_directories() {
    mkdir -p "$REPORTS_DIR"
    mkdir -p "$REPORTS_DIR/npm"
    mkdir -p "$REPORTS_DIR/cargo"
    mkdir -p "$REPORTS_DIR/trivy"
    mkdir -p "$REPORTS_DIR/combined"
}

# NPM Security Audit
npm_security_scan() {
    log_info "Running NPM security audit..."
    
    cd "$PROJECT_ROOT"
    
    # Run npm audit
    if npm audit --audit-level=moderate --json > "$REPORTS_DIR/npm/audit-${TIMESTAMP}.json" 2>/dev/null; then
        log_success "NPM audit completed successfully"
    else
        log_warning "NPM audit found vulnerabilities"
    fi
    
    # Parse results
    local vuln_count=$(cat "$REPORTS_DIR/npm/audit-${TIMESTAMP}.json" | jq '.metadata.vulnerabilities.total // 0')
    
    if [ "$vuln_count" -gt 0 ]; then
        log_warning "Found $vuln_count NPM vulnerabilities"
        
        if [ "$FIX_MODE" = true ]; then
            log_info "Applying NPM security fixes..."
            npm audit fix --force || log_warning "Some NPM fixes failed"
            
            # Run audit again to check results
            npm audit --audit-level=moderate --json > "$REPORTS_DIR/npm/audit-post-fix-${TIMESTAMP}.json" 2>/dev/null || true
            local remaining_vulns=$(cat "$REPORTS_DIR/npm/audit-post-fix-${TIMESTAMP}.json" | jq '.metadata.vulnerabilities.total // 0')
            log_info "Remaining vulnerabilities after fix: $remaining_vulns"
        fi
    else
        log_success "No NPM vulnerabilities found"
    fi
    
    return $vuln_count
}

# Cargo Security Audit
cargo_security_scan() {
    log_info "Running Cargo security audit..."
    
    cd "$PROJECT_ROOT/src-tauri"
    
    # Install cargo-audit if not present
    if ! command -v cargo-audit &> /dev/null; then
        log_info "Installing cargo-audit..."
        cargo install cargo-audit || {
            log_error "Failed to install cargo-audit"
            return 1
        }
    fi
    
    # Run cargo audit
    if cargo audit --json > "$REPORTS_DIR/cargo/audit-${TIMESTAMP}.json" 2>/dev/null; then
        log_success "Cargo audit completed successfully"
    else
        log_warning "Cargo audit found vulnerabilities"
    fi
    
    # Parse results
    local vuln_count=$(cat "$REPORTS_DIR/cargo/audit-${TIMESTAMP}.json" | jq '.vulnerabilities | length // 0')
    
    if [ "$vuln_count" -gt 0 ]; then
        log_warning "Found $vuln_count Cargo vulnerabilities"
        
        if [ "$FIX_MODE" = true ]; then
            log_info "Updating Cargo dependencies..."
            cargo update || log_warning "Some Cargo updates failed"
            
            # Run audit again
            cargo audit --json > "$REPORTS_DIR/cargo/audit-post-fix-${TIMESTAMP}.json" 2>/dev/null || true
            local remaining_vulns=$(cat "$REPORTS_DIR/cargo/audit-post-fix-${TIMESTAMP}.json" | jq '.vulnerabilities | length // 0')
            log_info "Remaining vulnerabilities after update: $remaining_vulns"
        fi
    else
        log_success "No Cargo vulnerabilities found"
    fi
    
    cd "$PROJECT_ROOT"
    return $vuln_count
}

# Trivy Container Scan
trivy_scan() {
    log_info "Running Trivy filesystem scan..."
    
    # Check if trivy is installed
    if ! command -v trivy &> /dev/null; then
        log_warning "Trivy not installed, skipping container scan"
        return 0
    fi
    
    cd "$PROJECT_ROOT"
    
    # Scan filesystem
    trivy fs --format json --output "$REPORTS_DIR/trivy/fs-scan-${TIMESTAMP}.json" . || {
        log_warning "Trivy filesystem scan completed with issues"
    }
    
    # Count vulnerabilities
    local vuln_count=0
    if [ -f "$REPORTS_DIR/trivy/fs-scan-${TIMESTAMP}.json" ]; then
        vuln_count=$(cat "$REPORTS_DIR/trivy/fs-scan-${TIMESTAMP}.json" | jq '[.Results[]?.Vulnerabilities[]?] | length // 0')
        
        if [ "$vuln_count" -gt 0 ]; then
            log_warning "Found $vuln_count filesystem vulnerabilities"
        else
            log_success "No filesystem vulnerabilities found"
        fi
    fi
    
    return $vuln_count
}

# License compliance check
license_check() {
    log_info "Running license compliance check..."
    
    cd "$PROJECT_ROOT"
    
    # Check NPM licenses
    if command -v license-checker &> /dev/null; then
        license-checker --json > "$REPORTS_DIR/combined/licenses-${TIMESTAMP}.json" || true
    else
        log_warning "license-checker not installed, installing..."
        npm install -g license-checker || {
            log_warning "Failed to install license-checker"
            return 0
        }
        license-checker --json > "$REPORTS_DIR/combined/licenses-${TIMESTAMP}.json" || true
    fi
    
    # Check for problematic licenses
    local problematic_licenses=("GPL-3.0" "AGPL-3.0" "LGPL-3.0")
    local license_issues=0
    
    for license in "${problematic_licenses[@]}"; do
        if grep -q "$license" "$REPORTS_DIR/combined/licenses-${TIMESTAMP}.json" 2>/dev/null; then
            log_warning "Found potentially problematic license: $license"
            license_issues=$((license_issues + 1))
        fi
    done
    
    if [ $license_issues -eq 0 ]; then
        log_success "No license compliance issues found"
    fi
    
    return $license_issues
}

# Generate combined report
generate_report() {
    local npm_vulns=$1
    local cargo_vulns=$2
    local trivy_vulns=$3
    local license_issues=$4
    local total_vulns=$((npm_vulns + cargo_vulns + trivy_vulns + license_issues))
    
    log_info "Generating security report..."
    
    # Create JSON report
    cat > "$REPORTS_DIR/combined/security-report-${TIMESTAMP}.json" << EOF
{
  "timestamp": "$(date -u -Iseconds)",
  "scan_id": "${TIMESTAMP}",
  "summary": {
    "total_vulnerabilities": ${total_vulns},
    "npm_vulnerabilities": ${npm_vulns},
    "cargo_vulnerabilities": ${cargo_vulns},
    "filesystem_vulnerabilities": ${trivy_vulns},
    "license_issues": ${license_issues},
    "fix_mode": ${FIX_MODE},
    "status": "$([ $total_vulns -eq 0 ] && echo "CLEAN" || echo "VULNERABILITIES_FOUND")"
  },
  "details": {
    "npm_report": "$REPORTS_DIR/npm/audit-${TIMESTAMP}.json",
    "cargo_report": "$REPORTS_DIR/cargo/audit-${TIMESTAMP}.json",
    "trivy_report": "$REPORTS_DIR/trivy/fs-scan-${TIMESTAMP}.json",
    "license_report": "$REPORTS_DIR/combined/licenses-${TIMESTAMP}.json"
  }
}
EOF

    # Create Markdown report
    cat > "$REPORTS_DIR/combined/security-report-${TIMESTAMP}.md" << EOF
# 🔒 Security Scan Report

**Generated:** $(date -u)  
**Scan ID:** ${TIMESTAMP}  
**Fix Mode:** $([ "$FIX_MODE" = true ] && echo "Enabled" || echo "Disabled")

## 📊 Summary

| Category | Vulnerabilities Found |
|----------|----------------------|
| NPM Dependencies | ${npm_vulns} |
| Cargo Dependencies | ${cargo_vulns} |
| Filesystem Scan | ${trivy_vulns} |
| License Issues | ${license_issues} |
| **Total** | **${total_vulns}** |

## 🎯 Overall Status

$([ $total_vulns -eq 0 ] && echo "✅ **CLEAN** - No security issues found" || echo "⚠️ **VULNERABILITIES FOUND** - Action required")

## 📋 Detailed Reports

- **NPM Audit:** \`$REPORTS_DIR/npm/audit-${TIMESTAMP}.json\`
- **Cargo Audit:** \`$REPORTS_DIR/cargo/audit-${TIMESTAMP}.json\`
- **Trivy Scan:** \`$REPORTS_DIR/trivy/fs-scan-${TIMESTAMP}.json\`
- **License Check:** \`$REPORTS_DIR/combined/licenses-${TIMESTAMP}.json\`

## 🔧 Recommendations

$(if [ $npm_vulns -gt 0 ]; then echo "- Run \`npm audit fix\` to fix NPM vulnerabilities"; fi)
$(if [ $cargo_vulns -gt 0 ]; then echo "- Run \`cargo update\` to update Cargo dependencies"; fi)
$(if [ $trivy_vulns -gt 0 ]; then echo "- Review filesystem vulnerabilities and update base images"; fi)
$(if [ $license_issues -gt 0 ]; then echo "- Review and resolve license compliance issues"; fi)

## 🚀 Next Steps

1. Review detailed reports for specific vulnerability information
2. Prioritize fixes based on severity levels
3. Test fixes in development environment
4. Deploy security updates to production

---
*Generated by AutoDev-AI Security Scanner*
EOF

    # Output summary
    if [ "$JSON_OUTPUT" = true ]; then
        cat "$REPORTS_DIR/combined/security-report-${TIMESTAMP}.json"
    else
        echo
        log_info "Security scan completed!"
        echo "📊 Summary:"
        echo "  - NPM vulnerabilities: $npm_vulns"
        echo "  - Cargo vulnerabilities: $cargo_vulns"
        echo "  - Filesystem vulnerabilities: $trivy_vulns"
        echo "  - License issues: $license_issues"
        echo "  - Total issues: $total_vulns"
        echo
        echo "📄 Reports generated:"
        echo "  - JSON: $REPORTS_DIR/combined/security-report-${TIMESTAMP}.json"
        echo "  - Markdown: $REPORTS_DIR/combined/security-report-${TIMESTAMP}.md"
    fi
    
    return $total_vulns
}

# Main execution
main() {
    log_info "Starting AutoDev-AI Security Scanner..."
    log_info "Timestamp: $TIMESTAMP"
    log_info "Fix mode: $([ "$FIX_MODE" = true ] && echo "Enabled" || echo "Disabled")"
    
    setup_directories
    
    # Run scans
    npm_security_scan
    local npm_result=$?
    
    cargo_security_scan
    local cargo_result=$?
    
    trivy_scan
    local trivy_result=$?
    
    license_check
    local license_result=$?
    
    # Generate report
    if [ "$REPORT_MODE" = true ] || [ "$JSON_OUTPUT" = true ]; then
        generate_report $npm_result $cargo_result $trivy_result $license_result
        local total_issues=$?
    else
        local total_issues=$((npm_result + cargo_result + trivy_result + license_result))
    fi
    
    # Exit with appropriate code
    if [ $total_issues -gt 0 ]; then
        log_warning "Security scan completed with $total_issues total issues"
        exit 1
    else
        log_success "Security scan completed successfully - no issues found"
        exit 0
    fi
}

# Run main function
main "$@"