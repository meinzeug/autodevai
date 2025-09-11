#!/bin/bash

# Roadmap Execution Script - Phase 3
# Executes tasks from docs/roadmap.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

error_exit() {
    log "${RED}ERROR: $1${NC}"
    exit 1
}

success() {
    log "${GREEN}✅ $1${NC}"
}

info() {
    log "${BLUE}ℹ️  $1${NC}"
}

# Check if roadmap exists
check_roadmap() {
    local roadmap_file="$PROJECT_ROOT/docs/roadmap.md"
    
    if [ ! -f "$roadmap_file" ]; then
        error_exit "Roadmap file not found: $roadmap_file"
    fi
    
    info "Roadmap file found: $roadmap_file"
    return 0
}

# Execute roadmap using claude-flow SPARC methodology
execute_with_claude_flow() {
    info "Executing roadmap using Claude Flow SPARC methodology..."
    
    local roadmap_file="$PROJECT_ROOT/docs/roadmap.md"
    
    if command -v npx &> /dev/null; then
        info "Using Claude Flow to process roadmap..."
        
        # Initialize SPARC workflow
        log "Initializing SPARC workflow for roadmap execution..."
        npx claude-flow@alpha hooks pre-task --description "roadmap-execution"
        
        # Execute roadmap pipeline
        log "Executing SPARC pipeline for roadmap tasks..."
        if npx claude-flow@alpha sparc pipeline "Execute high-priority items from $roadmap_file following SPARC methodology"; then
            success "Roadmap execution initiated via Claude Flow"
            
            # Store execution record
            npx claude-flow@alpha hooks post-edit \
                --memory-key "roadmap/execution/$(date +%Y%m%d-%H%M%S)" \
                --value "$(cat << EOF
{
  "executed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "roadmap_file": "$roadmap_file",
  "methodology": "SPARC",
  "trigger": "automated-github-workflow",
  "status": "initiated"
}
EOF
)"
            
            npx claude-flow@alpha hooks post-task --task-id "roadmap-execution"
        else
            log "Claude Flow execution failed, falling back to manual parsing"
            return 1
        fi
    else
        log "Claude Flow not available, falling back to manual execution"
        return 1
    fi
}

# Parse roadmap manually and execute high-priority items
execute_manual_roadmap() {
    info "Parsing roadmap manually..."
    
    local roadmap_file="$PROJECT_ROOT/docs/roadmap.md"
    
    # Extract high-priority tasks (look for patterns like "Priority: High" or "🔥")
    local high_priority_tasks=$(grep -E "(Priority.*High|🔥|Priority.*Critical|PRIORITY.*HIGH)" "$roadmap_file" -A 5 -B 2 || echo "")
    
    if [ -n "$high_priority_tasks" ]; then
        info "High-priority tasks found:"
        echo "$high_priority_tasks" | head -20
        
        # Create a simple execution plan
        local execution_plan="$PROJECT_ROOT/logs/roadmap-execution-$(date +%Y%m%d-%H%M%S).md"
        mkdir -p "$(dirname "$execution_plan")"
        
        cat > "$execution_plan" << EOF
# Roadmap Execution Plan
Generated: $(date)

## High-Priority Tasks Identified
\`\`\`
$high_priority_tasks
\`\`\`

## Execution Status
- ✅ Roadmap parsed successfully
- ⏳ Tasks identified for execution
- 📝 Manual review recommended

## Next Steps
1. Review identified tasks
2. Create feature branches as needed
3. Implement changes following SPARC methodology
4. Create PRs for review

## Notes
This is an automated execution plan. Manual review and implementation required.
EOF
        
        success "Execution plan created: $execution_plan"
    else
        info "No high-priority tasks found with standard markers"
        
        # Look for any TODO items or action items
        local todo_items=$(grep -E "(TODO|FIXME|Action|Task)" "$roadmap_file" || echo "")
        if [ -n "$todo_items" ]; then
            info "TODO/Action items found:"
            echo "$todo_items" | head -10
        else
            info "No actionable items found in roadmap"
        fi
    fi
}

# Create PR for any roadmap changes
create_roadmap_pr() {
    info "Checking if roadmap execution resulted in changes..."
    
    if git diff-index --quiet HEAD --; then
        info "No changes to commit from roadmap execution"
        return 0
    fi
    
    # Create a new branch for roadmap changes
    local branch_name="roadmap/$(date +%Y%m%d-%H%M%S)"
    
    git checkout -b "$branch_name"
    git add -A
    
    # Commit changes
    local commit_msg="feat: Implement roadmap items

- Executed high-priority roadmap tasks
- Applied SPARC methodology
- Generated via automated workflow

Co-authored-by: GitHub Workflow <noreply@github.com>"
    
    git commit -m "$commit_msg"
    
    # Push branch
    if git push -u origin "$branch_name"; then
        success "Roadmap changes pushed to branch: $branch_name"
        
        # Create PR if GitHub CLI is available
        if command -v gh &> /dev/null; then
            if gh pr create \
                --title "feat: Roadmap implementation $(date +%Y-%m-%d)" \
                --body "## Roadmap Implementation

This PR contains automated implementation of roadmap tasks.

### Changes
- High-priority roadmap tasks implemented
- SPARC methodology applied
- Generated via automated GitHub workflow

### Review Notes
Please review the changes and ensure they meet requirements before merging.

---
🤖 Generated by GitHub Workflow Automation"; then
                success "Pull request created successfully"
            else
                log "Failed to create PR, manual creation required"
            fi
        fi
    else
        log "Failed to push branch, manual push required"
    fi
}

# Send completion notification
send_notification() {
    info "Sending roadmap execution notification..."
    
    if command -v npx &> /dev/null; then
        local message="Roadmap execution completed at $(date). Check logs and any created PRs for details."
        npx claude-flow@alpha hooks notify --message "$message" 2>/dev/null || {
            log "Notification failed, continuing..."
        }
    fi
}

# Main execution
main() {
    cd "$PROJECT_ROOT" || error_exit "Failed to change to project root"
    
    log "🎯 Starting Roadmap Execution (Phase 3)"
    log "======================================"
    
    # Check prerequisites one more time
    if ! bash "$SCRIPT_DIR/../github-status-check.sh" > /dev/null 2>&1; then
        error_exit "Prerequisites check failed. Cannot execute roadmap."
    fi
    
    success "Prerequisites verified"
    
    # Check roadmap exists
    check_roadmap
    
    # Try Claude Flow execution first
    if ! execute_with_claude_flow; then
        log "Claude Flow execution not available, using manual approach"
        execute_manual_roadmap
    fi
    
    # Create PR for any changes
    create_roadmap_pr
    
    # Send notification
    send_notification
    
    success "Roadmap execution completed!"
    
    # Final instructions
    echo ""
    log "Next steps:"
    log "1. Review any created PRs"
    log "2. Check execution logs"
    log "3. Validate changes in development environment"
    log "4. Merge PRs after review"
}

# Handle dry run mode
if [ "${DRY_RUN:-}" = "true" ]; then
    log "DRY RUN MODE - No changes will be committed"
    
    # Override functions for dry run
    create_roadmap_pr() {
        info "DRY RUN: Would create PR for roadmap changes"
    }
    
    send_notification() {
        info "DRY RUN: Would send completion notification"
    }
fi

# Execute main function
main "$@"