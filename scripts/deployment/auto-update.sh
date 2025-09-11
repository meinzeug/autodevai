#!/bin/bash

# AutoDev-AI Auto-Update System
# Secure automatic application updates with rollback capability

set -euo pipefail

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly UPDATE_CONFIG_FILE="${UPDATE_CONFIG_FILE:-$PROJECT_ROOT/update-config.json}"
readonly UPDATE_LOG_FILE="${UPDATE_LOG_FILE:-$PROJECT_ROOT/logs/auto-update.log}"
readonly BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"

# Default configuration
readonly DEFAULT_UPDATE_CONFIG='{
    "auto_update_enabled": true,
    "update_channel": "stable",
    "check_interval": 3600,
    "maintenance_window": {
        "enabled": true,
        "start_hour": 2,
        "end_hour": 4,
        "timezone": "UTC"
    },
    "rollback": {
        "enabled": true,
        "health_check_timeout": 300,
        "max_failed_health_checks": 3
    },
    "notification": {
        "enabled": true,
        "channels": ["slack", "email"],
        "on_success": true,
        "on_failure": true,
        "on_rollback": true
    }
}'

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Logging functions
log() {
    local message="[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $*"
    echo -e "${BLUE}$message${NC}" >&2
    echo "$message" >> "$UPDATE_LOG_FILE"
}

warn() {
    local message="[$(date +'%Y-%m-%d %H:%M:%S')] WARN: $*"
    echo -e "${YELLOW}$message${NC}" >&2
    echo "$message" >> "$UPDATE_LOG_FILE"
}

error() {
    local message="[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $*"
    echo -e "${RED}$message${NC}" >&2
    echo "$message" >> "$UPDATE_LOG_FILE"
}

success() {
    local message="[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $*"
    echo -e "${GREEN}$message${NC}" >&2
    echo "$message" >> "$UPDATE_LOG_FILE"
}

# Initialize update system
init_update_system() {
    log "Initializing auto-update system..."
    
    # Create necessary directories
    mkdir -p "$(dirname "$UPDATE_LOG_FILE")"
    mkdir -p "$BACKUP_DIR"
    
    # Create default config if it doesn't exist
    if [[ ! -f "$UPDATE_CONFIG_FILE" ]]; then
        echo "$DEFAULT_UPDATE_CONFIG" | jq '.' > "$UPDATE_CONFIG_FILE"
        log "Created default update configuration"
    fi
    
    # Validate configuration
    if ! jq '.' "$UPDATE_CONFIG_FILE" > /dev/null 2>&1; then
        error "Invalid update configuration JSON"
        return 1
    fi
    
    success "Auto-update system initialized"
}

# Load configuration
load_config() {
    if [[ ! -f "$UPDATE_CONFIG_FILE" ]]; then
        error "Update configuration file not found"
        return 1
    fi
    
    # Extract configuration values
    AUTO_UPDATE_ENABLED=$(jq -r '.auto_update_enabled // true' "$UPDATE_CONFIG_FILE")
    UPDATE_CHANNEL=$(jq -r '.update_channel // "stable"' "$UPDATE_CONFIG_FILE")
    CHECK_INTERVAL=$(jq -r '.check_interval // 3600' "$UPDATE_CONFIG_FILE")
    MAINTENANCE_ENABLED=$(jq -r '.maintenance_window.enabled // true' "$UPDATE_CONFIG_FILE")
    MAINTENANCE_START=$(jq -r '.maintenance_window.start_hour // 2' "$UPDATE_CONFIG_FILE")
    MAINTENANCE_END=$(jq -r '.maintenance_window.end_hour // 4' "$UPDATE_CONFIG_FILE")
    ROLLBACK_ENABLED=$(jq -r '.rollback.enabled // true' "$UPDATE_CONFIG_FILE")
    HEALTH_CHECK_TIMEOUT=$(jq -r '.rollback.health_check_timeout // 300' "$UPDATE_CONFIG_FILE")
}

# Check if we're in maintenance window
in_maintenance_window() {
    if [[ "$MAINTENANCE_ENABLED" != "true" ]]; then
        return 0  # Always allow updates if maintenance window is disabled
    fi
    
    local current_hour=$(date +%H)
    current_hour=${current_hour#0}  # Remove leading zero
    
    if (( current_hour >= MAINTENANCE_START && current_hour < MAINTENANCE_END )); then
        return 0  # In maintenance window
    else
        return 1  # Outside maintenance window
    fi
}

# Get current version
get_current_version() {
    if [[ -f "$PROJECT_ROOT/src-tauri/tauri.conf.json" ]]; then
        jq -r '.version' "$PROJECT_ROOT/src-tauri/tauri.conf.json"
    else
        echo "unknown"
    fi
}

# Check for updates
check_for_updates() {
    log "Checking for updates..."
    
    local current_version
    current_version=$(get_current_version)
    
    # Check GitHub releases API
    local latest_release_info
    if ! latest_release_info=$(curl -s https://api.github.com/repos/autodev-ai/neural-bridge/releases/latest); then
        error "Failed to fetch latest release information"
        return 1
    fi
    
    local latest_version
    latest_version=$(echo "$latest_release_info" | jq -r '.tag_name')
    
    if [[ "$latest_version" == "null" || -z "$latest_version" ]]; then
        error "Invalid release information received"
        return 1
    fi
    
    log "Current version: $current_version"
    log "Latest version: $latest_version"
    
    if [[ "$current_version" != "$latest_version" ]]; then
        log "Update available: $current_version -> $latest_version"
        echo "$latest_release_info" > "$BACKUP_DIR/latest-release.json"
        return 0
    else
        log "Already up to date"
        return 1
    fi
}

# Create backup
create_backup() {
    log "Creating backup before update..."
    
    local backup_timestamp
    backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="$BACKUP_DIR/backup_$backup_timestamp"
    
    mkdir -p "$backup_path"
    
    # Backup critical files
    local backup_items=(
        "src-tauri/tauri.conf.json"
        "src-tauri/Cargo.toml"
        "package.json"
        "docker-compose.yml"
        "k8s/"
        "config/"
    )
    
    for item in "${backup_items[@]}"; do
        if [[ -e "$PROJECT_ROOT/$item" ]]; then
            cp -r "$PROJECT_ROOT/$item" "$backup_path/" 2>/dev/null || warn "Failed to backup $item"
        fi
    done
    
    # Create backup metadata
    cat > "$backup_path/metadata.json" << EOF
{
    "backup_timestamp": "$backup_timestamp",
    "current_version": "$(get_current_version)",
    "git_commit": "$(git -C "$PROJECT_ROOT" rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "created_by": "auto-update",
    "backup_path": "$backup_path"
}
EOF
    
    echo "$backup_path" > "$BACKUP_DIR/latest-backup.txt"
    success "Backup created: $backup_path"
}

# Download and verify update
download_update() {
    log "Downloading update..."
    
    if [[ ! -f "$BACKUP_DIR/latest-release.json" ]]; then
        error "Release information not found"
        return 1
    fi
    
    local release_info
    release_info=$(cat "$BACKUP_DIR/latest-release.json")
    
    local download_url
    download_url=$(echo "$release_info" | jq -r '.tarball_url')
    
    if [[ "$download_url" == "null" || -z "$download_url" ]]; then
        error "Download URL not found in release information"
        return 1
    fi
    
    local download_path="$BACKUP_DIR/update.tar.gz"
    
    if ! curl -L -o "$download_path" "$download_url"; then
        error "Failed to download update"
        return 1
    fi
    
    # Verify download integrity
    local expected_sha
    expected_sha=$(echo "$release_info" | jq -r '.body' | grep -o 'SHA256: [a-f0-9]*' | cut -d' ' -f2 || echo "")
    
    if [[ -n "$expected_sha" ]]; then
        local actual_sha
        actual_sha=$(sha256sum "$download_path" | cut -d' ' -f1)
        
        if [[ "$expected_sha" != "$actual_sha" ]]; then
            error "Update integrity verification failed"
            error "Expected: $expected_sha"
            error "Actual: $actual_sha"
            rm -f "$download_path"
            return 1
        fi
        
        success "Update integrity verified"
    else
        warn "No integrity hash found, skipping verification"
    fi
    
    success "Update downloaded successfully"
}

# Apply update
apply_update() {
    log "Applying update..."
    
    local download_path="$BACKUP_DIR/update.tar.gz"
    local extract_path="$BACKUP_DIR/update_extracted"
    
    if [[ ! -f "$download_path" ]]; then
        error "Update package not found"
        return 1
    fi
    
    # Extract update
    mkdir -p "$extract_path"
    if ! tar -xzf "$download_path" -C "$extract_path" --strip-components=1; then
        error "Failed to extract update"
        return 1
    fi
    
    # Apply update files (selective update)
    local update_files=(
        "src-tauri/tauri.conf.json"
        "src-tauri/Cargo.toml"
        "src-tauri/src/"
        "package.json"
        "src/"
        "public/"
    )
    
    for file in "${update_files[@]}"; do
        if [[ -e "$extract_path/$file" ]]; then
            log "Updating $file..."
            if [[ -d "$extract_path/$file" ]]; then
                rm -rf "$PROJECT_ROOT/$file"
                cp -r "$extract_path/$file" "$PROJECT_ROOT/$file"
            else
                cp "$extract_path/$file" "$PROJECT_ROOT/$file"
            fi
        fi
    done
    
    # Update dependencies
    cd "$PROJECT_ROOT"
    if [[ -f "package.json" ]]; then
        npm install --production --silent || warn "Failed to update npm dependencies"
    fi
    
    if [[ -f "src-tauri/Cargo.toml" ]]; then
        cd src-tauri
        cargo update --quiet || warn "Failed to update Rust dependencies"
        cd ..
    fi
    
    success "Update applied successfully"
}

# Health check
run_health_check() {
    log "Running health check..."
    
    local health_endpoints=(
        "http://localhost:50020/health"
        "http://localhost:50021/health"
        "http://localhost:50022/health"
    )
    
    local failed_checks=0
    local max_failures=3
    local timeout=30
    
    for endpoint in "${health_endpoints[@]}"; do
        log "Checking $endpoint..."
        
        local check_count=0
        while [[ $check_count -lt $max_failures ]]; do
            if timeout "$timeout" curl -f -s "$endpoint" &> /dev/null; then
                success "$endpoint is healthy"
                break
            fi
            
            ((check_count++))
            if [[ $check_count -ge $max_failures ]]; then
                error "$endpoint failed health check"
                ((failed_checks++))
            else
                warn "$endpoint not ready, retrying... ($check_count/$max_failures)"
                sleep 10
            fi
        done
    done
    
    if [[ $failed_checks -gt 0 ]]; then
        error "Health check failed: $failed_checks endpoint(s) unhealthy"
        return 1
    fi
    
    success "All health checks passed"
}

# Rollback update
rollback_update() {
    warn "Rolling back update..."
    
    if [[ ! -f "$BACKUP_DIR/latest-backup.txt" ]]; then
        error "No backup found for rollback"
        return 1
    fi
    
    local backup_path
    backup_path=$(cat "$BACKUP_DIR/latest-backup.txt")
    
    if [[ ! -d "$backup_path" ]]; then
        error "Backup directory not found: $backup_path"
        return 1
    fi
    
    # Restore files from backup
    local backup_items=(
        "src-tauri/tauri.conf.json"
        "src-tauri/Cargo.toml"
        "package.json"
        "docker-compose.yml"
        "k8s/"
        "config/"
    )
    
    for item in "${backup_items[@]}"; do
        if [[ -e "$backup_path/$item" ]]; then
            log "Restoring $item..."
            if [[ -d "$backup_path/$item" ]]; then
                rm -rf "$PROJECT_ROOT/$item"
                cp -r "$backup_path/$item" "$PROJECT_ROOT/"
            else
                cp "$backup_path/$item" "$PROJECT_ROOT/$item"
            fi
        fi
    done
    
    # Restart services
    restart_services
    
    # Wait and check health
    sleep 30
    if run_health_check; then
        success "Rollback completed successfully"
        send_notification "rollback_success" "Auto-update rollback completed successfully"
    else
        error "Rollback health check failed"
        send_notification "rollback_failed" "Auto-update rollback health check failed"
        return 1
    fi
}

# Restart services
restart_services() {
    log "Restarting services..."
    
    # Restart Docker services if running
    if docker-compose -f "$PROJECT_ROOT/docker-compose.yml" ps | grep -q "Up"; then
        docker-compose -f "$PROJECT_ROOT/docker-compose.yml" restart
    fi
    
    # Restart Kubernetes deployment if running
    if kubectl get deployment autodev-ai-deployment -n autodev-ai &> /dev/null; then
        kubectl rollout restart deployment/autodev-ai-deployment -n autodev-ai
        kubectl rollout status deployment/autodev-ai-deployment -n autodev-ai --timeout=300s
    fi
    
    success "Services restarted"
}

# Send notification
send_notification() {
    local event_type="$1"
    local message="$2"
    
    log "Sending notification: $event_type"
    
    # Slack notification
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color="good"
        case "$event_type" in
            "update_failed"|"rollback_failed") color="danger" ;;
            "rollback_success") color="warning" ;;
        esac
        
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"AutoDev-AI Auto-Update\",
                    \"text\": \"$message\",
                    \"fields\": [{
                        \"title\": \"Version\",
                        \"value\": \"$(get_current_version)\",
                        \"short\": true
                    }, {
                        \"title\": \"Timestamp\",
                        \"value\": \"$(date)\",
                        \"short\": true
                    }]
                }]
            }" || warn "Slack notification failed"
    fi
    
    # Email notification
    if [[ -n "${NOTIFICATION_EMAIL:-}" ]]; then
        echo "$message at $(date)" | \
            mail -s "AutoDev-AI Auto-Update: $event_type" "$NOTIFICATION_EMAIL" || \
            warn "Email notification failed"
    fi
}

# Main update process
perform_update() {
    log "Starting update process..."
    
    if [[ "$AUTO_UPDATE_ENABLED" != "true" ]]; then
        log "Auto-update is disabled"
        return 0
    fi
    
    if ! in_maintenance_window; then
        log "Outside maintenance window, skipping update"
        return 0
    fi
    
    if ! check_for_updates; then
        return 0  # No updates available
    fi
    
    local update_success=true
    
    create_backup || { error "Failed to create backup"; return 1; }
    
    if download_update && apply_update; then
        restart_services
        
        sleep 30  # Wait for services to start
        
        if run_health_check; then
            success "Update completed successfully"
            send_notification "update_success" "Auto-update completed successfully to version $(get_current_version)"
        else
            error "Post-update health check failed"
            update_success=false
        fi
    else
        error "Failed to apply update"
        update_success=false
    fi
    
    if [[ "$update_success" != "true" && "$ROLLBACK_ENABLED" == "true" ]]; then
        send_notification "update_failed" "Auto-update failed, initiating rollback"
        rollback_update
    fi
    
    # Cleanup
    rm -f "$BACKUP_DIR/update.tar.gz"
    rm -rf "$BACKUP_DIR/update_extracted"
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Keep last 5 backups
    find "$BACKUP_DIR" -name "backup_*" -type d | \
        sort -r | \
        tail -n +6 | \
        xargs -r rm -rf
    
    success "Old backups cleaned up"
}

# Status check
status_check() {
    echo "=== AutoDev-AI Auto-Update Status ==="
    echo "Configuration file: $UPDATE_CONFIG_FILE"
    echo "Log file: $UPDATE_LOG_FILE"
    echo "Backup directory: $BACKUP_DIR"
    echo "Current version: $(get_current_version)"
    
    if [[ -f "$UPDATE_CONFIG_FILE" ]]; then
        echo "Auto-update enabled: $(jq -r '.auto_update_enabled' "$UPDATE_CONFIG_FILE")"
        echo "Update channel: $(jq -r '.update_channel' "$UPDATE_CONFIG_FILE")"
        echo "Check interval: $(jq -r '.check_interval' "$UPDATE_CONFIG_FILE")s"
    fi
    
    if in_maintenance_window; then
        echo "Maintenance window: ACTIVE"
    else
        echo "Maintenance window: INACTIVE"
    fi
    
    echo "Last update check: $(date)"
}

# Main function
main() {
    case "${1:-update}" in
        "init")
            init_update_system
            ;;
        "update")
            init_update_system
            load_config
            perform_update
            cleanup_old_backups
            ;;
        "check")
            load_config
            check_for_updates && echo "Update available" || echo "No updates"
            ;;
        "rollback")
            rollback_update
            ;;
        "status")
            status_check
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        *)
            echo "Usage: $0 {init|update|check|rollback|status|cleanup}"
            exit 1
            ;;
    esac
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi