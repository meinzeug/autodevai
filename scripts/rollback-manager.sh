#!/bin/bash

# AutoDev-AI Rollback Manager
# Comprehensive rollback and recovery system for failed pipeline operations
# Usage: ./scripts/rollback-manager.sh <action> [options]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/.pipeline-backups"
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

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

log_critical() {
    echo -e "${PURPLE}[CRITICAL]${NC} $1"
}

# Display help information
show_help() {
    cat << EOF
AutoDev-AI Rollback Manager

USAGE:
    $0 <action> [options]

ACTIONS:
    create-snapshot [name]     Create a backup snapshot
    list-snapshots            List available snapshots
    rollback <snapshot>       Rollback to a specific snapshot
    emergency-rollback        Emergency rollback to last known good state
    cleanup [days]            Clean up old snapshots (default: 30 days)
    verify <snapshot>         Verify snapshot integrity
    status                    Show rollback system status
    auto-recovery             Automatic recovery based on health checks

OPTIONS:
    --dry-run                Simulate actions without making changes
    --force                  Force operations without confirmation
    --verbose               Verbose output
    --include-deps          Include node_modules and target in snapshots
    --exclude-large         Exclude large files from snapshots

EXAMPLES:
    $0 create-snapshot "pre-maintenance"
    $0 rollback backup-20241211_093000
    $0 emergency-rollback
    $0 cleanup 7

ENVIRONMENT VARIABLES:
    ROLLBACK_BACKUP_DIR     Custom backup directory
    ROLLBACK_MAX_SNAPSHOTS  Maximum snapshots to keep (default: 10)
    ROLLBACK_COMPRESSION    Compression level 0-9 (default: 6)
EOF
}

# Parse command line arguments
ACTION=""
SNAPSHOT_NAME=""
DRY_RUN=false
FORCE=false
VERBOSE=false
INCLUDE_DEPS=false
EXCLUDE_LARGE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        create-snapshot|list-snapshots|rollback|emergency-rollback|cleanup|verify|status|auto-recovery)
            ACTION="$1"
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --include-deps)
            INCLUDE_DEPS=true
            shift
            ;;
        --exclude-large)
            EXCLUDE_LARGE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        -*)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
        *)
            if [ -z "$SNAPSHOT_NAME" ]; then
                SNAPSHOT_NAME="$1"
            else
                log_error "Too many arguments"
                show_help
                exit 1
            fi
            shift
            ;;
    esac
done

# Validate required action
if [ -z "$ACTION" ]; then
    log_error "No action specified"
    show_help
    exit 1
fi

# Environment configuration
BACKUP_DIR="${ROLLBACK_BACKUP_DIR:-$BACKUP_DIR}"
MAX_SNAPSHOTS="${ROLLBACK_MAX_SNAPSHOTS:-10}"
COMPRESSION_LEVEL="${ROLLBACK_COMPRESSION:-6}"

# Initialize backup system
initialize_backup_system() {
    log_info "Initializing rollback system..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$BACKUP_DIR/snapshots"
    mkdir -p "$BACKUP_DIR/logs"
    mkdir -p "$BACKUP_DIR/metadata"
    
    # Create system info file
    cat > "$BACKUP_DIR/system-info.json" << EOF
{
    "initialized": "$(date -u -Iseconds)",
    "version": "1.0.0",
    "project_root": "$PROJECT_ROOT",
    "max_snapshots": $MAX_SNAPSHOTS,
    "compression_level": $COMPRESSION_LEVEL
}
EOF
    
    log_success "Rollback system initialized"
}

# Create a backup snapshot
create_snapshot() {
    local snapshot_id="${SNAPSHOT_NAME:-"backup-$TIMESTAMP"}"
    local snapshot_dir="$BACKUP_DIR/snapshots/$snapshot_id"
    
    log_info "Creating snapshot: $snapshot_id"
    
    if [ "$DRY_RUN" = true ]; then
        log_info "DRY RUN - Would create snapshot $snapshot_id"
        return 0
    fi
    
    # Check if snapshot already exists
    if [ -d "$snapshot_dir" ] && [ "$FORCE" = false ]; then
        log_error "Snapshot $snapshot_id already exists. Use --force to overwrite."
        exit 1
    fi
    
    # Create snapshot directory
    mkdir -p "$snapshot_dir"
    
    # Create metadata
    create_snapshot_metadata "$snapshot_id"
    
    # Create file exclusion list
    local exclude_file="/tmp/rollback-exclude-$$.txt"
    create_exclusion_list "$exclude_file"
    
    log_info "Backing up project files..."
    
    # Create compressed archive of project
    cd "$PROJECT_ROOT"
    
    tar -czf "$snapshot_dir/project.tar.gz" \
        --exclude-from="$exclude_file" \
        --exclude=".pipeline-backups" \
        . || {
        log_error "Failed to create project backup"
        rm -rf "$snapshot_dir"
        rm -f "$exclude_file"
        exit 1
    }
    
    # Backup critical configuration files
    backup_critical_files "$snapshot_dir"
    
    # Store git information
    backup_git_state "$snapshot_dir"
    
    # Store system state
    backup_system_state "$snapshot_dir"
    
    # Cleanup
    rm -f "$exclude_file"
    
    # Verify snapshot
    if verify_snapshot_integrity "$snapshot_id"; then
        log_success "Snapshot $snapshot_id created successfully"
        
        # Update snapshot registry
        update_snapshot_registry "$snapshot_id"
        
        # Cleanup old snapshots
        cleanup_old_snapshots
    else
        log_error "Snapshot verification failed"
        rm -rf "$snapshot_dir"
        exit 1
    fi
}

# Create snapshot metadata
create_snapshot_metadata() {
    local snapshot_id="$1"
    local metadata_file="$BACKUP_DIR/metadata/$snapshot_id.json"
    
    # Get git information
    local git_branch=""
    local git_commit=""
    local git_status=""
    
    if git rev-parse --git-dir > /dev/null 2>&1; then
        git_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
        git_commit=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
        git_status=$(git status --porcelain 2>/dev/null | wc -l)
    fi
    
    # Get system information
    local node_version=$(node --version 2>/dev/null || echo "not installed")
    local rust_version=$(rustc --version 2>/dev/null || echo "not installed")
    local npm_version=$(npm --version 2>/dev/null || echo "not installed")
    
    cat > "$metadata_file" << EOF
{
    "snapshot_id": "$snapshot_id",
    "created_at": "$(date -u -Iseconds)",
    "created_by": "$(whoami)",
    "hostname": "$(hostname)",
    "project_root": "$PROJECT_ROOT",
    "git": {
        "branch": "$git_branch",
        "commit": "$git_commit",
        "uncommitted_changes": $git_status
    },
    "system": {
        "os": "$(uname -s)",
        "arch": "$(uname -m)",
        "node_version": "$node_version",
        "rust_version": "$rust_version",
        "npm_version": "$npm_version"
    },
    "options": {
        "include_deps": $INCLUDE_DEPS,
        "exclude_large": $EXCLUDE_LARGE,
        "compression_level": $COMPRESSION_LEVEL
    },
    "size": {
        "compressed": 0,
        "uncompressed": 0
    },
    "integrity": {
        "checksum": "",
        "verified": false
    }
}
EOF
    
    # Calculate sizes and checksum after creation
    if [ -f "$BACKUP_DIR/snapshots/$snapshot_id/project.tar.gz" ]; then
        local compressed_size=$(stat -f%z "$BACKUP_DIR/snapshots/$snapshot_id/project.tar.gz" 2>/dev/null || stat -c%s "$BACKUP_DIR/snapshots/$snapshot_id/project.tar.gz" 2>/dev/null || echo 0)
        local checksum=$(sha256sum "$BACKUP_DIR/snapshots/$snapshot_id/project.tar.gz" 2>/dev/null | cut -d' ' -f1 || echo "unknown")
        
        # Update metadata with actual values
        jq ".size.compressed = $compressed_size | .integrity.checksum = \"$checksum\"" "$metadata_file" > "$metadata_file.tmp" && mv "$metadata_file.tmp" "$metadata_file"
    fi
}

# Create file exclusion list
create_exclusion_list() {
    local exclude_file="$1"
    
    cat > "$exclude_file" << 'EOF'
# Version control
.git
.gitignore

# Dependencies (unless --include-deps)
node_modules
target
dist
build
coverage

# Logs
*.log
logs
*.log.*

# Cache
.cache
.npm
.cargo/registry
.cargo/git

# Temporary files
*.tmp
*.temp
.DS_Store
Thumbs.db

# IDE
.vscode
.idea
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
*.tmp

# Large files (if --exclude-large)
*.iso
*.dmg
*.zip
*.tar.gz
*.tar.bz2
EOF

    # Add conditional exclusions
    if [ "$INCLUDE_DEPS" = false ]; then
        echo "node_modules" >> "$exclude_file"
        echo "target" >> "$exclude_file"
        echo ".cargo" >> "$exclude_file"
    fi
    
    if [ "$EXCLUDE_LARGE" = true ]; then
        find "$PROJECT_ROOT" -type f -size +100M 2>/dev/null | sed "s|$PROJECT_ROOT/||" >> "$exclude_file" || true
    fi
}

# Backup critical configuration files
backup_critical_files() {
    local snapshot_dir="$1"
    local config_dir="$snapshot_dir/config"
    
    mkdir -p "$config_dir"
    
    # Package configuration
    [ -f "package.json" ] && cp "package.json" "$config_dir/"
    [ -f "package-lock.json" ] && cp "package-lock.json" "$config_dir/"
    [ -f "Cargo.toml" ] && cp "Cargo.toml" "$config_dir/"
    [ -f "Cargo.lock" ] && cp "Cargo.lock" "$config_dir/"
    
    # Build configuration
    [ -f "tsconfig.json" ] && cp "tsconfig.json" "$config_dir/"
    [ -f "vite.config.ts" ] && cp "vite.config.ts" "$config_dir/"
    [ -f "tailwind.config.js" ] && cp "tailwind.config.js" "$config_dir/"
    
    # CI/CD configuration
    [ -d ".github" ] && cp -r ".github" "$config_dir/"
    [ -f "Dockerfile" ] && cp "Dockerfile" "$config_dir/"
    [ -f "docker-compose.yml" ] && cp "docker-compose.yml" "$config_dir/"
}

# Backup git state
backup_git_state() {
    local snapshot_dir="$1"
    local git_dir="$snapshot_dir/git"
    
    mkdir -p "$git_dir"
    
    if git rev-parse --git-dir > /dev/null 2>&1; then
        # Save git information
        git log --oneline -10 > "$git_dir/recent-commits.txt" 2>/dev/null || true
        git status --porcelain > "$git_dir/status.txt" 2>/dev/null || true
        git branch -a > "$git_dir/branches.txt" 2>/dev/null || true
        git remote -v > "$git_dir/remotes.txt" 2>/dev/null || true
        
        # Save current diff
        git diff > "$git_dir/working-diff.patch" 2>/dev/null || true
        git diff --staged > "$git_dir/staged-diff.patch" 2>/dev/null || true
    fi
}

# Backup system state
backup_system_state() {
    local snapshot_dir="$1"
    local system_dir="$snapshot_dir/system"
    
    mkdir -p "$system_dir"
    
    # System information
    uname -a > "$system_dir/uname.txt"
    env > "$system_dir/environment.txt"
    
    # Process information
    ps aux > "$system_dir/processes.txt" 2>/dev/null || true
    
    # Network information
    netstat -tuln > "$system_dir/network.txt" 2>/dev/null || ss -tuln > "$system_dir/network.txt" 2>/dev/null || true
    
    # Disk usage
    df -h > "$system_dir/disk-usage.txt" 2>/dev/null || true
    
    # Running services
    if command -v systemctl >/dev/null; then
        systemctl list-units --type=service > "$system_dir/services.txt" 2>/dev/null || true
    fi
}

# List available snapshots
list_snapshots() {
    log_info "Available snapshots:"
    
    if [ ! -d "$BACKUP_DIR/snapshots" ]; then
        log_warning "No snapshots found. Run 'create-snapshot' first."
        return 0
    fi
    
    local snapshots=($(ls -1t "$BACKUP_DIR/snapshots" 2>/dev/null || true))
    
    if [ ${#snapshots[@]} -eq 0 ]; then
        log_warning "No snapshots found."
        return 0
    fi
    
    printf "%-30s %-20s %-15s %-10s %s\n" "SNAPSHOT ID" "CREATED" "SIZE" "STATUS" "DESCRIPTION"
    printf "%-30s %-20s %-15s %-10s %s\n" "----------" "-------" "----" "------" "-----------"
    
    for snapshot in "${snapshots[@]}"; do
        local metadata_file="$BACKUP_DIR/metadata/$snapshot.json"
        local snapshot_dir="$BACKUP_DIR/snapshots/$snapshot"
        
        if [ -f "$metadata_file" ]; then
            local created_at=$(jq -r '.created_at' "$metadata_file" 2>/dev/null | cut -d'T' -f1)
            local compressed_size=$(jq -r '.size.compressed' "$metadata_file" 2>/dev/null)
            local verified=$(jq -r '.integrity.verified' "$metadata_file" 2>/dev/null)
            
            # Format size
            local size_mb=$((compressed_size / 1024 / 1024))
            local size_str="${size_mb}MB"
            
            # Status
            local status="✓"
            [ "$verified" = "false" ] && status="?"
            [ ! -d "$snapshot_dir" ] && status="✗"
            
            printf "%-30s %-20s %-15s %-10s %s\n" "$snapshot" "$created_at" "$size_str" "$status" "Automatic backup"
        else
            printf "%-30s %-20s %-15s %-10s %s\n" "$snapshot" "Unknown" "Unknown" "✗" "Missing metadata"
        fi
    done
}

# Verify snapshot integrity
verify_snapshot_integrity() {
    local snapshot_id="$1"
    local snapshot_dir="$BACKUP_DIR/snapshots/$snapshot_id"
    local metadata_file="$BACKUP_DIR/metadata/$snapshot_id.json"
    
    log_info "Verifying snapshot: $snapshot_id"
    
    # Check if snapshot exists
    if [ ! -d "$snapshot_dir" ]; then
        log_error "Snapshot directory not found: $snapshot_dir"
        return 1
    fi
    
    if [ ! -f "$metadata_file" ]; then
        log_error "Metadata file not found: $metadata_file"
        return 1
    fi
    
    # Check main backup file
    local backup_file="$snapshot_dir/project.tar.gz"
    if [ ! -f "$backup_file" ]; then
        log_error "Main backup file not found: $backup_file"
        return 1
    fi
    
    # Verify checksum
    local stored_checksum=$(jq -r '.integrity.checksum' "$metadata_file" 2>/dev/null)
    if [ "$stored_checksum" != "null" ] && [ "$stored_checksum" != "unknown" ]; then
        local actual_checksum=$(sha256sum "$backup_file" 2>/dev/null | cut -d' ' -f1)
        
        if [ "$stored_checksum" != "$actual_checksum" ]; then
            log_error "Checksum verification failed"
            log_error "Expected: $stored_checksum"
            log_error "Actual: $actual_checksum"
            return 1
        fi
    fi
    
    # Test archive integrity
    if ! tar -tzf "$backup_file" > /dev/null 2>&1; then
        log_error "Archive integrity check failed"
        return 1
    fi
    
    # Update verification status in metadata
    if [ "$DRY_RUN" = false ]; then
        jq '.integrity.verified = true' "$metadata_file" > "$metadata_file.tmp" && mv "$metadata_file.tmp" "$metadata_file"
    fi
    
    log_success "Snapshot $snapshot_id verified successfully"
    return 0
}

# Rollback to a specific snapshot
rollback_snapshot() {
    local snapshot_id="$1"
    local snapshot_dir="$BACKUP_DIR/snapshots/$snapshot_id"
    local backup_file="$snapshot_dir/project.tar.gz"
    
    log_critical "Starting rollback to snapshot: $snapshot_id"
    
    if [ "$DRY_RUN" = true ]; then
        log_info "DRY RUN - Would rollback to snapshot $snapshot_id"
        return 0
    fi
    
    # Verify snapshot first
    if ! verify_snapshot_integrity "$snapshot_id"; then
        log_error "Snapshot verification failed. Aborting rollback."
        exit 1
    fi
    
    # Confirmation check
    if [ "$FORCE" = false ]; then
        echo -e "${YELLOW}WARNING: This will replace the current project state with snapshot $snapshot_id${NC}"
        echo -e "${YELLOW}Current uncommitted changes will be lost.${NC}"
        read -p "Are you sure you want to continue? (yes/no): " confirm
        
        if [ "$confirm" != "yes" ]; then
            log_info "Rollback cancelled by user"
            exit 0
        fi
    fi
    
    # Create safety snapshot before rollback
    log_info "Creating safety snapshot before rollback..."
    SNAPSHOT_NAME="pre-rollback-$TIMESTAMP" create_snapshot
    
    # Perform rollback
    log_info "Performing rollback..."
    
    # Save current state
    local current_branch=""
    if git rev-parse --git-dir > /dev/null 2>&1; then
        current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
    fi
    
    # Clean working directory (but keep .git)
    cd "$PROJECT_ROOT"
    
    # Remove files but preserve git and backups
    find . -mindepth 1 -maxdepth 1 \
        ! -name '.git' \
        ! -name '.pipeline-backups' \
        -exec rm -rf {} + 2>/dev/null || true
    
    # Extract snapshot
    log_info "Extracting snapshot files..."
    if ! tar -xzf "$backup_file" -C "$PROJECT_ROOT"; then
        log_error "Failed to extract snapshot. System may be in inconsistent state."
        exit 1
    fi
    
    # Restore git state if available
    local git_state_dir="$snapshot_dir/git"
    if [ -d "$git_state_dir" ] && git rev-parse --git-dir > /dev/null 2>&1; then
        log_info "Restoring git state..."
        
        # Apply working directory changes
        if [ -f "$git_state_dir/working-diff.patch" ] && [ -s "$git_state_dir/working-diff.patch" ]; then
            git apply "$git_state_dir/working-diff.patch" 2>/dev/null || log_warning "Could not apply working directory changes"
        fi
        
        # Apply staged changes
        if [ -f "$git_state_dir/staged-diff.patch" ] && [ -s "$git_state_dir/staged-diff.patch" ]; then
            git apply --cached "$git_state_dir/staged-diff.patch" 2>/dev/null || log_warning "Could not apply staged changes"
        fi
    fi
    
    # Reinstall dependencies
    log_info "Reinstalling dependencies..."
    if [ -f "package.json" ]; then
        npm install --no-audit --no-fund || log_warning "Failed to install NPM dependencies"
    fi
    
    if [ -f "Cargo.toml" ]; then
        cd "$(dirname "$(find . -name Cargo.toml | head -1)")"
        cargo build || log_warning "Failed to build Rust dependencies"
        cd "$PROJECT_ROOT"
    fi
    
    # Log rollback
    log_rollback_event "$snapshot_id" "success"
    
    log_success "Rollback to $snapshot_id completed successfully"
    log_info "A safety snapshot was created: pre-rollback-$TIMESTAMP"
}

# Emergency rollback
emergency_rollback() {
    log_critical "EMERGENCY ROLLBACK INITIATED"
    
    # Find the most recent verified snapshot
    local snapshots=($(ls -1t "$BACKUP_DIR/snapshots" 2>/dev/null || true))
    local best_snapshot=""
    
    for snapshot in "${snapshots[@]}"; do
        local metadata_file="$BACKUP_DIR/metadata/$snapshot.json"
        if [ -f "$metadata_file" ]; then
            local verified=$(jq -r '.integrity.verified' "$metadata_file" 2>/dev/null)
            if [ "$verified" = "true" ]; then
                best_snapshot="$snapshot"
                break
            fi
        fi
    done
    
    if [ -z "$best_snapshot" ]; then
        log_error "No verified snapshots found for emergency rollback"
        exit 1
    fi
    
    log_info "Emergency rollback to: $best_snapshot"
    
    # Force rollback without confirmation
    FORCE=true rollback_snapshot "$best_snapshot"
}

# Auto-recovery based on health checks
auto_recovery() {
    log_info "Running auto-recovery health checks..."
    
    local health_score=0
    local max_score=100
    
    # Check 1: Can we build the project? (25 points)
    if npm run build >/dev/null 2>&1; then
        health_score=$((health_score + 25))
        log_success "Build check: PASS"
    else
        log_error "Build check: FAIL"
    fi
    
    # Check 2: Do tests pass? (25 points)
    if npm test >/dev/null 2>&1; then
        health_score=$((health_score + 25))
        log_success "Test check: PASS"
    else
        log_error "Test check: FAIL"
    fi
    
    # Check 3: Are critical files present? (25 points)
    local critical_files=("package.json" "src" "src-tauri/Cargo.toml")
    local missing_files=0
    
    for file in "${critical_files[@]}"; do
        if [ ! -e "$file" ]; then
            missing_files=$((missing_files + 1))
            log_warning "Missing critical file: $file"
        fi
    done
    
    if [ $missing_files -eq 0 ]; then
        health_score=$((health_score + 25))
        log_success "Critical files check: PASS"
    else
        log_error "Critical files check: FAIL ($missing_files missing)"
    fi
    
    # Check 4: Security scan (25 points)
    if ./scripts/security-scanner.sh --json >/dev/null 2>&1; then
        health_score=$((health_score + 25))
        log_success "Security check: PASS"
    else
        log_warning "Security check: ISSUES FOUND"
        health_score=$((health_score + 10)) # Partial points
    fi
    
    log_info "Overall health score: $health_score/$max_score"
    
    # Determine action based on health score
    if [ $health_score -ge 75 ]; then
        log_success "System healthy - no recovery needed"
        return 0
    elif [ $health_score -ge 50 ]; then
        log_warning "System degraded - consider manual intervention"
        return 1
    elif [ $health_score -ge 25 ]; then
        log_error "System unhealthy - automatic recovery recommended"
        
        if [ "$FORCE" = true ]; then
            log_info "Performing automatic recovery..."
            emergency_rollback
        else
            log_info "Run with --force to perform automatic recovery"
        fi
        return 2
    else
        log_critical "System critical - emergency rollback required"
        
        if [ "$FORCE" = true ]; then
            emergency_rollback
        else
            log_info "Run with --force to perform emergency rollback"
        fi
        return 3
    fi
}

# Update snapshot registry
update_snapshot_registry() {
    local snapshot_id="$1"
    local registry_file="$BACKUP_DIR/snapshot-registry.json"
    
    # Create registry if it doesn't exist
    if [ ! -f "$registry_file" ]; then
        echo '{"snapshots": []}' > "$registry_file"
    fi
    
    # Add new snapshot to registry
    local temp_file="/tmp/registry-update-$$.json"
    jq --arg id "$snapshot_id" --arg timestamp "$(date -u -Iseconds)" \
       '.snapshots += [{"id": $id, "created_at": $timestamp, "type": "manual"}]' \
       "$registry_file" > "$temp_file" && mv "$temp_file" "$registry_file"
}

# Cleanup old snapshots
cleanup_old_snapshots() {
    local days="${1:-30}"
    
    log_info "Cleaning up snapshots older than $days days..."
    
    if [ "$DRY_RUN" = true ]; then
        log_info "DRY RUN - Would cleanup old snapshots"
        return 0
    fi
    
    # Find old snapshots
    local old_snapshots=($(find "$BACKUP_DIR/snapshots" -maxdepth 1 -type d -mtime +$days 2>/dev/null | xargs basename 2>/dev/null || true))
    
    for snapshot in "${old_snapshots[@]}"; do
        if [ "$snapshot" != "snapshots" ]; then
            log_info "Removing old snapshot: $snapshot"
            rm -rf "$BACKUP_DIR/snapshots/$snapshot"
            rm -f "$BACKUP_DIR/metadata/$snapshot.json"
        fi
    done
    
    # Also limit by count
    local all_snapshots=($(ls -1t "$BACKUP_DIR/snapshots" 2>/dev/null || true))
    local count=0
    
    for snapshot in "${all_snapshots[@]}"; do
        count=$((count + 1))
        if [ $count -gt $MAX_SNAPSHOTS ]; then
            log_info "Removing excess snapshot: $snapshot"
            rm -rf "$BACKUP_DIR/snapshots/$snapshot"
            rm -f "$BACKUP_DIR/metadata/$snapshot.json"
        fi
    done
}

# Log rollback events
log_rollback_event() {
    local snapshot_id="$1"
    local status="$2"
    local log_file="$BACKUP_DIR/logs/rollback.log"
    
    echo "$(date -u -Iseconds) - Rollback to $snapshot_id: $status" >> "$log_file"
}

# Show rollback system status
show_status() {
    log_info "AutoDev-AI Rollback System Status"
    
    echo
    echo "📁 Backup Directory: $BACKUP_DIR"
    echo "🔢 Max Snapshots: $MAX_SNAPSHOTS"
    echo "🗜️  Compression Level: $COMPRESSION_LEVEL"
    
    if [ -d "$BACKUP_DIR" ]; then
        local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
        echo "💾 Total Backup Size: $total_size"
        
        local snapshot_count=$(ls -1 "$BACKUP_DIR/snapshots" 2>/dev/null | wc -l)
        echo "📊 Available Snapshots: $snapshot_count"
        
        if [ $snapshot_count -gt 0 ]; then
            echo
            list_snapshots
        fi
    else
        echo "❌ Backup system not initialized"
    fi
    
    echo
    echo "🔍 System Health:"
    auto_recovery
}

# Main execution
main() {
    # Initialize backup system if needed
    if [ ! -d "$BACKUP_DIR" ]; then
        initialize_backup_system
    fi
    
    # Execute requested action
    case "$ACTION" in
        create-snapshot)
            create_snapshot
            ;;
        list-snapshots)
            list_snapshots
            ;;
        rollback)
            if [ -z "$SNAPSHOT_NAME" ]; then
                log_error "Snapshot name required for rollback"
                exit 1
            fi
            rollback_snapshot "$SNAPSHOT_NAME"
            ;;
        emergency-rollback)
            emergency_rollback
            ;;
        cleanup)
            cleanup_old_snapshots "$SNAPSHOT_NAME"
            ;;
        verify)
            if [ -z "$SNAPSHOT_NAME" ]; then
                log_error "Snapshot name required for verification"
                exit 1
            fi
            verify_snapshot_integrity "$SNAPSHOT_NAME"
            ;;
        status)
            show_status
            ;;
        auto-recovery)
            auto_recovery
            ;;
        *)
            log_error "Unknown action: $ACTION"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"