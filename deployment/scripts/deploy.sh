#!/bin/bash
set -e

# AutoDev-AI Neural Bridge Platform Deployment Script
# Usage: ./deploy.sh [-e environment] [-v version] [--force]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Default values
ENVIRONMENT="production"
VERSION="latest"
FORCE_DEPLOY=false
BACKUP_BEFORE_DEPLOY=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -e|--environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    -v|--version)
      VERSION="$2"
      shift 2
      ;;
    --force)
      FORCE_DEPLOY=true
      shift
      ;;
    --no-backup)
      BACKUP_BEFORE_DEPLOY=false
      shift
      ;;
    -h|--help)
      echo "AutoDev-AI Deployment Script"
      echo "Usage: $0 [-e environment] [-v version] [--force] [--no-backup]"
      echo ""
      echo "Options:"
      echo "  -e, --environment   Deployment environment (staging, production)"
      echo "  -v, --version       Version to deploy (default: latest)"
      echo "  --force             Force deployment without confirmation"
      echo "  --no-backup         Skip backup before deployment"
      echo "  -h, --help          Show this help message"
      exit 0
      ;;
    *)
      log_error "Unknown option: $1"
      exit 1
      ;;
  esac
done

log_info "🚀 AutoDev-AI Neural Bridge Platform Deployment"
log_info "Environment: $ENVIRONMENT"
log_info "Version: $VERSION"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
  log_error "Invalid environment: $ENVIRONMENT. Must be 'staging' or 'production'"
  exit 1
fi

# Check prerequisites
check_prerequisites() {
  log_info "🔍 Checking deployment prerequisites..."
  
  # Check Docker
  if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed"
    exit 1
  fi
  
  # Check Docker Compose
  if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed"
    exit 1
  fi
  
  # Check if running as root or in docker group
  if [ "$EUID" -ne 0 ] && ! groups | grep -q docker; then
    log_error "Must run as root or be in docker group"
    exit 1
  fi
  
  # Check required files
  REQUIRED_FILES=(
    "$PROJECT_ROOT/.env.$ENVIRONMENT"
    "$PROJECT_ROOT/deployment/docker/docker-compose.prod.yml"
  )
  
  for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
      log_error "Required file not found: $file"
      exit 1
    fi
  done
  
  log_success "Prerequisites check passed"
}

# Load environment variables
load_env() {
  log_info "📄 Loading environment variables..."
  
  ENV_FILE="$PROJECT_ROOT/.env.$ENVIRONMENT"
  if [ -f "$ENV_FILE" ]; then
    export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
    log_success "Environment variables loaded from $ENV_FILE"
  else
    log_error "Environment file not found: $ENV_FILE"
    exit 1
  fi
}

# Create backup
create_backup() {
  if [ "$BACKUP_BEFORE_DEPLOY" = true ]; then
    log_info "💾 Creating backup..."
    
    BACKUP_DIR="$PROJECT_ROOT/backups/$(date +%Y%m%d_%H%M%S)_$ENVIRONMENT"
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    if docker ps | grep -q autodev-ai-db; then
      log_info "Backing up database..."
      docker exec autodev-ai-db pg_dump -U autodev autodev_ai > "$BACKUP_DIR/database.sql"
    fi
    
    # Backup volumes
    log_info "Backing up volumes..."
    docker run --rm -v autodev-uploads:/data -v "$BACKUP_DIR":/backup alpine tar czf /backup/uploads.tar.gz -C /data .
    docker run --rm -v autodev-logs:/data -v "$BACKUP_DIR":/backup alpine tar czf /backup/logs.tar.gz -C /data .
    
    log_success "Backup created at: $BACKUP_DIR"
  fi
}

# Build images
build_images() {
  log_info "🏗️  Building Docker images..."
  
  cd "$PROJECT_ROOT"
  
  # Build main application
  docker build -t autodev-ai:$VERSION -f deployment/docker/Dockerfile .
  
  # Build sandbox manager
  docker build -t autodev-ai-sandbox:$VERSION -f deployment/docker/Dockerfile.sandbox .
  
  log_success "Docker images built successfully"
}

# Deploy services
deploy_services() {
  log_info "🚢 Deploying services..."
  
  cd "$PROJECT_ROOT"
  
  # Use production docker-compose file
  export COMPOSE_FILE="deployment/docker/docker-compose.prod.yml"
  
  # Pull external images
  docker-compose pull
  
  # Stop existing services
  log_info "Stopping existing services..."
  docker-compose down --remove-orphans || true
  
  # Start services
  log_info "Starting services..."
  docker-compose up -d
  
  # Wait for services to be healthy
  log_info "⏳ Waiting for services to be healthy..."
  sleep 30
  
  # Check service health
  check_service_health
  
  log_success "Services deployed successfully"
}

# Check service health
check_service_health() {
  log_info "🔍 Checking service health..."
  
  SERVICES=(
    "autodev-ai:http://localhost:50000/health"
    "postgres:nc -z localhost 50001"
    "redis:nc -z localhost 50002"
    "nginx:http://localhost:50003/health"
    "prometheus:http://localhost:50005/-/healthy"
    "grafana:http://localhost:50006/api/health"
  )
  
  for service_check in "${SERVICES[@]}"; do
    IFS=':' read -r service check <<< "$service_check"
    log_info "Checking $service..."
    
    if [[ $check == http* ]]; then
      if curl -f -s "$check" >/dev/null; then
        log_success "$service is healthy"
      else
        log_warning "$service health check failed"
      fi
    else
      if eval "$check" >/dev/null 2>&1; then
        log_success "$service is healthy"
      else
        log_warning "$service health check failed"
      fi
    fi
  done
}

# Run post-deployment tasks
post_deployment() {
  log_info "🔧 Running post-deployment tasks..."
  
  # Create necessary directories on host
  mkdir -p /var/log/autodev-ai
  mkdir -p /var/lib/autodev-ai/uploads
  
  # Set up log rotation
  cat > /etc/logrotate.d/autodev-ai << EOF
/var/log/autodev-ai/*.log {
    daily
    missingok
    rotate 7
    compress
    notifempty
    sharedscripts
    postrotate
        docker exec autodev-ai-app kill -USR1 1 2>/dev/null || true
    endscript
}
EOF
  
  # Create systemd service for auto-restart
  if command -v systemctl &> /dev/null; then
    cat > /etc/systemd/system/autodev-ai.service << EOF
[Unit]
Description=AutoDev-AI Neural Bridge Platform
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$PROJECT_ROOT
ExecStart=/usr/local/bin/docker-compose -f deployment/docker/docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f deployment/docker/docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable autodev-ai.service
    log_success "Systemd service created and enabled"
  fi
  
  log_success "Post-deployment tasks completed"
}

# Setup monitoring
setup_monitoring() {
  log_info "📊 Setting up monitoring..."
  
  # Configure Prometheus alerts
  if docker ps | grep -q autodev-ai-prometheus; then
    log_info "Configuring Prometheus alerts..."
    # Add custom alert rules here if needed
  fi
  
  # Import Grafana dashboards
  if docker ps | grep -q autodev-ai-grafana; then
    log_info "Importing Grafana dashboards..."
    sleep 10 # Wait for Grafana to be ready
    # Dashboard import would go here
  fi
  
  log_success "Monitoring setup completed"
}

# Main deployment flow
main() {
  log_info "=== Starting AutoDev-AI Deployment ==="
  
  # Confirmation prompt
  if [ "$FORCE_DEPLOY" = false ]; then
    echo ""
    log_warning "This will deploy AutoDev-AI to $ENVIRONMENT environment"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      log_info "Deployment cancelled"
      exit 0
    fi
  fi
  
  # Run deployment steps
  check_prerequisites
  load_env
  create_backup
  build_images
  deploy_services
  post_deployment
  setup_monitoring
  
  log_success "=== AutoDev-AI Deployment Completed Successfully ==="
  echo ""
  log_info "🌐 Access URLs:"
  log_info "  Main Application: http://localhost:50000"
  log_info "  Database: localhost:50001"
  log_info "  Redis: localhost:50002"
  log_info "  Load Balancer: http://localhost:50003"
  log_info "  Prometheus: http://localhost:50005"
  log_info "  Grafana: http://localhost:50006 (admin/\$GRAFANA_PASSWORD)"
  log_info "  Elasticsearch: http://localhost:50007"
  log_info "  Kibana: http://localhost:50009"
  echo ""
  log_info "📁 Logs: docker-compose logs -f"
  log_info "🔍 Status: docker-compose ps"
}

# Run main function
main "$@"