#!/bin/bash

# GitHub Workflow Automation - Main Orchestrator
# Executes the 3-phase workflow in strict order

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$PROJECT_ROOT/logs/github-workflow-$(date +%Y%m%d-%H%M%S).log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "${RED}ERROR: $1${NC}"
    exit 1
}

# Success message
success() {
    log "${GREEN}✅ $1${NC}"
}

# Warning message
warning() {
    log "${YELLOW}⚠️  $1${NC}"
}

# Info message
info() {
    log "${BLUE}ℹ️  $1${NC}"
}

# Phase execution function
execute_phase() {
    local phase_num=$1
    local phase_name=$2
    local phase_script=$3
    
    echo ""
    log "════════════════════════════════════════════════════════"
    log "📍 PHASE $phase_num: $phase_name"
    log "════════════════════════════════════════════════════════"
    
    if [ -f "$phase_script" ]; then
        if bash "$phase_script"; then
            success "Phase $phase_num completed successfully"
            return 0
        else
            error_exit "Phase $phase_num failed. Workflow aborted."
        fi
    else
        error_exit "Phase script not found: $phase_script"
    fi
}

# Main workflow execution
main() {
    log "🚀 Starting GitHub Workflow Automation"
    log "Version: 1.0.0"
    log "Time: $(date)"
    log "User: $(whoami)"
    log "Directory: $PROJECT_ROOT"
    echo ""
    
    cd "$PROJECT_ROOT" || error_exit "Failed to change to project root"
    
    # Pre-flight checks
    info "Running pre-flight checks..."
    
    # Check for required tools
    for tool in git gh npm cargo jq; do
        if ! command -v "$tool" &> /dev/null; then
            error_exit "Required tool not found: $tool"
        fi
    done
    success "All required tools available"
    
    # Check git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        error_exit "Not in a git repository"
    fi
    success "Git repository verified"
    
    # Check GitHub CLI authentication
    if ! gh auth status &> /dev/null; then
        error_exit "GitHub CLI not authenticated. Run: gh auth login"
    fi
    success "GitHub CLI authenticated"
    
    # PHASE 1: GitHub Synchronization & PR Management
    execute_phase 1 "GitHub Synchronization & PR Management" "$SCRIPT_DIR/sync/github-sync.sh"
    
    # PHASE 2: Security & Issue Resolution
    execute_phase 2 "Security & Issue Resolution" "$SCRIPT_DIR/security/security-fix.sh"
    
    # PHASE 3: Roadmap Execution (conditional)
    info "Checking prerequisites for Phase 3..."
    
    if bash "$SCRIPT_DIR/github-status-check.sh"; then
        success "All prerequisites met for roadmap execution"
        execute_phase 3 "Roadmap Execution" "$SCRIPT_DIR/roadmap/execute-roadmap.sh"
    else
        warning "Prerequisites not met. Skipping roadmap execution."
        warning "Fix the issues above and run again."
    fi
    
    # Final summary
    echo ""
    log "════════════════════════════════════════════════════════"
    log "📊 WORKFLOW SUMMARY"
    log "════════════════════════════════════════════════════════"
    
    # Generate summary statistics
    local pr_count=$(gh pr list --state closed --limit 10 --json number | jq length)
    local issue_count=$(gh issue list --state closed --limit 10 --json number | jq length)
    
    info "PRs processed in this session: $pr_count"
    info "Issues resolved in this session: $issue_count"
    info "Log file: $LOG_FILE"
    
    success "GitHub Workflow Automation completed successfully!"
    
    # Send notification if available
    if command -v npx &> /dev/null; then
        npx claude-flow@alpha hooks notify --message "GitHub workflow completed successfully" 2>/dev/null || true
    fi
}

# Handle script arguments
case "${1:-}" in
    --dry-run)
        log "DRY RUN MODE - No changes will be made"
        export DRY_RUN=true
        main
        ;;
    --phase)
        if [ -z "${2:-}" ]; then
            error_exit "Phase number required. Usage: $0 --phase [1|2|3]"
        fi
        case "$2" in
            1)
                execute_phase 1 "GitHub Synchronization" "$SCRIPT_DIR/sync/github-sync.sh"
                ;;
            2)
                execute_phase 2 "Security Fix" "$SCRIPT_DIR/security/security-fix.sh"
                ;;
            3)
                execute_phase 3 "Roadmap Execution" "$SCRIPT_DIR/roadmap/execute-roadmap.sh"
                ;;
            *)
                error_exit "Invalid phase number. Use 1, 2, or 3"
                ;;
        esac
        ;;
    --help|-h)
        cat << EOF
GitHub Workflow Automation

Usage: $0 [OPTIONS]

Options:
  --dry-run         Run in dry-run mode (no changes)
  --phase [1|2|3]   Execute specific phase only
  --help            Show this help message

Phases:
  1. GitHub Synchronization & PR Management
  2. Security & Issue Resolution
  3. Roadmap Execution (conditional)

Examples:
  $0                    # Run complete workflow
  $0 --phase 1          # Run GitHub sync only
  $0 --dry-run          # Test workflow without changes

Documentation: docs/github-workflow-guide.md
EOF
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac