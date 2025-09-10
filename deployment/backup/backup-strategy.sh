#!/bin/bash
set -e

# AutoDev-AI Neural Bridge Platform - Comprehensive Backup Strategy
# This script implements a multi-tier backup strategy with encryption and rotation

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Backup Configuration
BACKUP_BASE_DIR="/backup/autodev-ai"
ENCRYPTION_KEY_FILE="/etc/autodev-ai/backup.key"
RETENTION_DAYS=30
RETENTION_WEEKLY=12
RETENTION_MONTHLY=12
COMPRESSION_LEVEL=6

# Remote Backup Configuration (S3, FTP, etc.)
REMOTE_BACKUP_ENABLED=${REMOTE_BACKUP_ENABLED:-false}
S3_BUCKET=${S3_BUCKET:-""}
AWS_REGION=${AWS_REGION:-"us-east-1"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Create timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_BASE_DIR/$TIMESTAMP"

# Initialize backup environment
init_backup() {
  log_info "🔧 Initializing backup environment..."
  
  # Create backup directories
  mkdir -p "$BACKUP_DIR"/{database,volumes,config,logs,application}
  mkdir -p "$BACKUP_BASE_DIR"/{daily,weekly,monthly}
  
  # Create encryption key if not exists
  if [ ! -f "$ENCRYPTION_KEY_FILE" ]; then
    log_info "Generating encryption key..."
    mkdir -p "$(dirname "$ENCRYPTION_KEY_FILE")"
    openssl rand -base64 32 > "$ENCRYPTION_KEY_FILE"
    chmod 600 "$ENCRYPTION_KEY_FILE"
    log_success "Encryption key created"
  fi
  
  log_success "Backup environment initialized"
}

# Backup PostgreSQL database
backup_database() {
  log_info "🗃️  Backing up PostgreSQL database..."
  
  if docker ps --format "table {{.Names}}" | grep -q autodev-ai-db; then
    # Full database dump
    docker exec autodev-ai-db pg_dump -U autodev -h localhost autodev_ai > "$BACKUP_DIR/database/autodev_ai.sql"
    
    # Schema-only backup
    docker exec autodev-ai-db pg_dump -U autodev -h localhost --schema-only autodev_ai > "$BACKUP_DIR/database/schema.sql"
    
    # Data-only backup
    docker exec autodev-ai-db pg_dump -U autodev -h localhost --data-only autodev_ai > "$BACKUP_DIR/database/data.sql"
    
    # Global objects (users, roles, etc.)
    docker exec autodev-ai-db pg_dumpall -U autodev -h localhost --globals-only > "$BACKUP_DIR/database/globals.sql"
    
    # Compress database backups
    gzip -$COMPRESSION_LEVEL "$BACKUP_DIR/database"/*.sql
    
    log_success "Database backup completed"
  else
    log_warning "PostgreSQL container not found, skipping database backup"
  fi
}

# Backup Redis data
backup_redis() {
  log_info "📊 Backing up Redis data..."
  
  if docker ps --format "table {{.Names}}" | grep -q autodev-ai-redis; then
    # Create Redis backup
    docker exec autodev-ai-redis redis-cli --rdb "$BACKUP_DIR/volumes/redis-dump.rdb"
    docker cp autodev-ai-redis:/data/dump.rdb "$BACKUP_DIR/volumes/redis-backup.rdb"
    
    # Compress Redis backup
    gzip -$COMPRESSION_LEVEL "$BACKUP_DIR/volumes/redis-backup.rdb"
    
    log_success "Redis backup completed"
  else
    log_warning "Redis container not found, skipping Redis backup"
  fi
}

# Backup Docker volumes
backup_volumes() {
  log_info "📦 Backing up Docker volumes..."
  
  VOLUMES=(
    "autodev-uploads"
    "autodev-logs"
    "autodev-temp"
    "postgres-data"
    "redis-data"
    "prometheus-data"
    "grafana-data"
    "elasticsearch-data"
    "sandbox-data"
  )
  
  for volume in "${VOLUMES[@]}"; do
    if docker volume ls --format "{{.Name}}" | grep -q "^$volume$"; then
      log_info "Backing up volume: $volume"
      
      docker run --rm \
        -v "$volume":/data \
        -v "$BACKUP_DIR/volumes":/backup \
        alpine \
        tar czf "/backup/${volume}.tar.gz" -C /data .
      
      log_success "Volume $volume backed up"
    else
      log_warning "Volume $volume not found, skipping"
    fi
  done
}

# Backup configuration files
backup_config() {
  log_info "⚙️  Backing up configuration files..."
  
  CONFIG_FILES=(
    "$PROJECT_ROOT/.env.production"
    "$PROJECT_ROOT/deployment/docker/docker-compose.prod.yml"
    "$PROJECT_ROOT/deployment/nginx/nginx.conf"
    "$PROJECT_ROOT/deployment/monitoring/prometheus.yml"
    "/etc/autodev-ai"
    "/etc/ssl/autodev-ai"
  )
  
  for config in "${CONFIG_FILES[@]}"; do
    if [ -e "$config" ]; then
      log_info "Backing up config: $config"
      
      if [ -d "$config" ]; then
        cp -r "$config" "$BACKUP_DIR/config/"
      else
        cp "$config" "$BACKUP_DIR/config/"
      fi
    else
      log_warning "Config not found: $config"
    fi
  done
  
  # Create system info snapshot
  {
    echo "# AutoDev-AI System Information - $TIMESTAMP"
    echo "## Docker Version"
    docker --version
    echo "## Docker Compose Version"
    docker-compose --version
    echo "## System Info"
    uname -a
    echo "## Disk Usage"
    df -h
    echo "## Memory Usage"
    free -h
    echo "## Running Containers"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo "## Docker Images"
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
    echo "## Network Configuration"
    docker network ls
  } > "$BACKUP_DIR/config/system-info.txt"
  
  log_success "Configuration backup completed"
}

# Backup application source
backup_application() {
  log_info "📁 Backing up application source..."
  
  # Create application backup excluding node_modules and build artifacts
  tar czf "$BACKUP_DIR/application/source.tar.gz" \
    --exclude="node_modules" \
    --exclude="dist" \
    --exclude="build" \
    --exclude=".git" \
    --exclude="temp" \
    --exclude="logs" \
    --exclude="backups" \
    --exclude="*.log" \
    -C "$PROJECT_ROOT" .
  
  # Backup package files separately
  cp "$PROJECT_ROOT/package.json" "$BACKUP_DIR/application/"
  cp "$PROJECT_ROOT/package-lock.json" "$BACKUP_DIR/application/" 2>/dev/null || true
  
  log_success "Application source backup completed"
}

# Backup system logs
backup_logs() {
  log_info "📄 Backing up system logs..."
  
  LOG_SOURCES=(
    "/var/log/autodev-ai"
    "/var/log/docker"
    "/var/log/nginx"
  )
  
  for log_source in "${LOG_SOURCES[@]}"; do
    if [ -d "$log_source" ]; then
      log_info "Backing up logs from: $log_source"
      tar czf "$BACKUP_DIR/logs/$(basename "$log_source")-logs.tar.gz" -C "$log_source" .
    fi
  done
  
  # Docker container logs
  if command -v docker &> /dev/null; then
    mkdir -p "$BACKUP_DIR/logs/docker"
    
    for container in $(docker ps --format "{{.Names}}"); do
      log_info "Backing up logs for container: $container"
      docker logs "$container" > "$BACKUP_DIR/logs/docker/${container}.log" 2>&1
    done
    
    tar czf "$BACKUP_DIR/logs/docker-container-logs.tar.gz" -C "$BACKUP_DIR/logs" docker/
    rm -rf "$BACKUP_DIR/logs/docker"
  fi
  
  log_success "System logs backup completed"
}

# Encrypt backup
encrypt_backup() {
  log_info "🔒 Encrypting backup..."
  
  if [ -f "$ENCRYPTION_KEY_FILE" ]; then
    tar czf - -C "$BACKUP_BASE_DIR" "$(basename "$BACKUP_DIR")" | \
    openssl enc -aes-256-cbc -salt -pass file:"$ENCRYPTION_KEY_FILE" > "$BACKUP_DIR.tar.gz.enc"
    
    # Remove unencrypted backup
    rm -rf "$BACKUP_DIR"
    
    log_success "Backup encrypted: $BACKUP_DIR.tar.gz.enc"
  else
    log_warning "Encryption key not found, creating compressed backup without encryption"
    tar czf "$BACKUP_DIR.tar.gz" -C "$BACKUP_BASE_DIR" "$(basename "$BACKUP_DIR")"
    rm -rf "$BACKUP_DIR"
  fi
}

# Upload to remote storage
upload_remote() {
  if [ "$REMOTE_BACKUP_ENABLED" = true ]; then
    log_info "☁️  Uploading to remote storage..."
    
    BACKUP_FILE="$BACKUP_DIR.tar.gz"
    [ -f "$BACKUP_DIR.tar.gz.enc" ] && BACKUP_FILE="$BACKUP_DIR.tar.gz.enc"
    
    if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
      log_info "Uploading to S3: $S3_BUCKET"
      aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/autodev-ai/backups/$(basename "$BACKUP_FILE")" \
        --region "$AWS_REGION" \
        --storage-class STANDARD_IA
      
      log_success "Backup uploaded to S3"
    else
      log_warning "S3 upload not configured or AWS CLI not available"
    fi
  fi
}

# Manage backup retention
manage_retention() {
  log_info "🗂️  Managing backup retention..."
  
  # Daily backups - keep for specified days
  find "$BACKUP_BASE_DIR" -name "*.tar.gz*" -type f -mtime +$RETENTION_DAYS -delete
  
  # Weekly backups - move to weekly folder and keep for specified weeks
  if [ $(date +%u) -eq 7 ]; then  # Sunday
    WEEKLY_DIR="$BACKUP_BASE_DIR/weekly"
    mkdir -p "$WEEKLY_DIR"
    
    BACKUP_FILE="$BACKUP_DIR.tar.gz"
    [ -f "$BACKUP_DIR.tar.gz.enc" ] && BACKUP_FILE="$BACKUP_DIR.tar.gz.enc"
    
    if [ -f "$BACKUP_FILE" ]; then
      cp "$BACKUP_FILE" "$WEEKLY_DIR/"
      log_success "Weekly backup created"
    fi
    
    # Clean old weekly backups
    find "$WEEKLY_DIR" -name "*.tar.gz*" -type f -mtime +$((RETENTION_WEEKLY * 7)) -delete
  fi
  
  # Monthly backups - move to monthly folder and keep for specified months
  if [ $(date +%d) -eq 01 ]; then  # First day of month
    MONTHLY_DIR="$BACKUP_BASE_DIR/monthly"
    mkdir -p "$MONTHLY_DIR"
    
    BACKUP_FILE="$BACKUP_DIR.tar.gz"
    [ -f "$BACKUP_DIR.tar.gz.enc" ] && BACKUP_FILE="$BACKUP_DIR.tar.gz.enc"
    
    if [ -f "$BACKUP_FILE" ]; then
      cp "$BACKUP_FILE" "$MONTHLY_DIR/"
      log_success "Monthly backup created"
    fi
    
    # Clean old monthly backups
    find "$MONTHLY_DIR" -name "*.tar.gz*" -type f -mtime +$((RETENTION_MONTHLY * 30)) -delete
  fi
  
  log_success "Backup retention managed"
}

# Verify backup integrity
verify_backup() {
  log_info "✅ Verifying backup integrity..."
  
  BACKUP_FILE="$BACKUP_DIR.tar.gz"
  [ -f "$BACKUP_DIR.tar.gz.enc" ] && BACKUP_FILE="$BACKUP_DIR.tar.gz.enc"
  
  if [ -f "$BACKUP_FILE" ]; then
    # Check file size
    BACKUP_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE")
    
    if [ "$BACKUP_SIZE" -gt 0 ]; then
      log_success "Backup file created successfully ($BACKUP_SIZE bytes)"
      
      # Test archive integrity
      if [[ "$BACKUP_FILE" == *.enc ]]; then
        log_info "Testing encrypted archive integrity..."
        if openssl enc -aes-256-cbc -d -salt -pass file:"$ENCRYPTION_KEY_FILE" -in "$BACKUP_FILE" | tar tz > /dev/null 2>&1; then
          log_success "Encrypted backup integrity verified"
        else
          log_error "Encrypted backup integrity check failed"
          return 1
        fi
      else
        log_info "Testing archive integrity..."
        if tar tzf "$BACKUP_FILE" > /dev/null 2>&1; then
          log_success "Backup integrity verified"
        else
          log_error "Backup integrity check failed"
          return 1
        fi
      fi
    else
      log_error "Backup file is empty or not created"
      return 1
    fi
  else
    log_error "Backup file not found"
    return 1
  fi
}

# Send notification
send_notification() {
  local status=$1
  local message=$2
  
  # Email notification (if configured)
  if [ -n "$NOTIFICATION_EMAIL" ] && command -v mail &> /dev/null; then
    echo "$message" | mail -s "AutoDev-AI Backup $status" "$NOTIFICATION_EMAIL"
  fi
  
  # Slack notification (if configured)
  if [ -n "$SLACK_WEBHOOK" ]; then
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"AutoDev-AI Backup $status: $message\"}" \
      "$SLACK_WEBHOOK" > /dev/null 2>&1
  fi
  
  # Discord notification (if configured)
  if [ -n "$DISCORD_WEBHOOK" ]; then
    curl -H "Content-Type: application/json" \
      -d "{\"content\":\"AutoDev-AI Backup $status: $message\"}" \
      "$DISCORD_WEBHOOK" > /dev/null 2>&1
  fi
}

# Main backup function
main() {
  local start_time=$(date +%s)
  
  log_info "=== AutoDev-AI Backup Started ==="
  log_info "Timestamp: $TIMESTAMP"
  log_info "Backup Directory: $BACKUP_DIR"
  
  # Initialize backup environment
  init_backup
  
  # Perform backups
  backup_database
  backup_redis
  backup_volumes
  backup_config
  backup_application
  backup_logs
  
  # Encrypt and compress
  encrypt_backup
  
  # Upload to remote storage
  upload_remote
  
  # Verify backup integrity
  if verify_backup; then
    # Manage retention
    manage_retention
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_success "=== AutoDev-AI Backup Completed Successfully ==="
    log_info "Duration: ${duration}s"
    
    send_notification "SUCCESS" "Backup completed successfully in ${duration}s"
  else
    log_error "=== AutoDev-AI Backup Failed ==="
    send_notification "FAILED" "Backup failed during verification"
    exit 1
  fi
}

# Usage information
usage() {
  echo "AutoDev-AI Backup Strategy Script"
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  --help          Show this help message"
  echo "  --config-only   Backup configuration files only"
  echo "  --db-only       Backup database only"
  echo "  --verify FILE   Verify backup file integrity"
  echo "  --restore FILE  Restore from backup file"
  echo ""
}

# Handle command line arguments
case "${1:-}" in
  --help)
    usage
    exit 0
    ;;
  --config-only)
    init_backup
    backup_config
    encrypt_backup
    verify_backup
    ;;
  --db-only)
    init_backup
    backup_database
    encrypt_backup
    verify_backup
    ;;
  --verify)
    if [ -z "$2" ]; then
      log_error "Please specify backup file to verify"
      exit 1
    fi
    # Verification logic for specific file
    log_info "Verifying backup file: $2"
    ;;
  --restore)
    if [ -z "$2" ]; then
      log_error "Please specify backup file to restore"
      exit 1
    fi
    log_warning "Restore functionality not implemented yet"
    exit 1
    ;;
  *)
    main
    ;;
esac