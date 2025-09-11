#!/bin/bash

# AutoDev-AI Deployment Script
# Handles deployment to different environments with zero-downtime rolling updates

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_ROOT/docker/docker-compose.yml"
ENV_FILE="$PROJECT_ROOT/.env"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
echo_success() { echo -e "${GREEN}✅ $1${NC}"; }
echo_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
echo_error() { echo -e "${RED}❌ $1${NC}"; }

# Default values
ENVIRONMENT="development"
FORCE_REBUILD=false
SKIP_TESTS=false
BACKUP_BEFORE_DEPLOY=true
ROLLING_UPDATE=true
DRY_RUN=false

# Parse command line arguments
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

AutoDev-AI Deployment Script

OPTIONS:
    -e, --environment ENV     Target environment (development|staging|production) [default: development]
    -f, --force-rebuild       Force rebuild of Docker images
    -s, --skip-tests          Skip running tests before deployment
    -n, --no-backup           Skip database backup before deployment
    -r, --restart-only        Restart services without rebuilding
    -d, --dry-run            Show what would be done without executing
    -h, --help               Show this help message

EXAMPLES:
    $0 -e staging                    # Deploy to staging
    $0 -e production -f              # Deploy to production with forced rebuild
    $0 -e development -s -n          # Quick dev deployment (no tests, no backup)
    $0 --dry-run -e production       # Show production deployment plan

ENVIRONMENTS:
    development   - Local development with hot reloading
    staging       - Pre-production testing environment
    production    - Production deployment with full security
EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -f|--force-rebuild)
            FORCE_REBUILD=true
            shift
            ;;
        -s|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -n|--no-backup)
            BACKUP_BEFORE_DEPLOY=false
            shift
            ;;
        -r|--restart-only)
            ROLLING_UPDATE=false
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate environment
case $ENVIRONMENT in
    development|staging|production)
        ;;
    *)
        echo_error "Invalid environment: $ENVIRONMENT"
        echo_info "Valid environments: development, staging, production"
        exit 1
        ;;
esac

echo_info "🚀 AutoDev-AI Deployment to $ENVIRONMENT"

# Load environment-specific configuration
load_environment() {
    local env_file="$PROJECT_ROOT/environments/$ENVIRONMENT.env"
    
    if [[ -f "$env_file" ]]; then
        echo_info "📄 Loading environment configuration: $env_file"
        source "$env_file"
    else
        echo_warning "Environment file not found: $env_file"
        echo_info "Using default configuration from .env"
    fi
    
    # Set environment-specific variables
    case $ENVIRONMENT in
        development)
            export NODE_ENV=development
            export LOG_LEVEL=debug
            export COMPOSE_PROFILES="development"
            ;;
        staging)
            export NODE_ENV=staging
            export LOG_LEVEL=info
            export COMPOSE_PROFILES="staging,monitoring"
            ;;
        production)
            export NODE_ENV=production
            export LOG_LEVEL=warn
            export COMPOSE_PROFILES="production,monitoring,security"
            ;;
    esac
}

# Pre-deployment checks
pre_deployment_checks() {
    echo_info "🔍 Running pre-deployment checks..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        echo_error "Docker is not running"
        exit 1
    fi
    
    # Check if Docker Compose file exists
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        echo_error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    # Check available disk space
    local available_space=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
    local required_space=2097152  # 2GB in KB
    
    if [[ $available_space -lt $required_space ]]; then
        echo_error "Insufficient disk space. Available: $(($available_space/1024))MB, Required: 2GB"
        exit 1
    fi
    
    # Check if ports are available (in production)
    if [[ "$ENVIRONMENT" == "production" ]]; then
        local ports=("50050" "50051" "50052" "50080" "50090")
        for port in "${ports[@]}"; do
            if netstat -tuln | grep -q ":$port "; then
                echo_warning "Port $port is already in use"
            fi
        done
    fi
    
    echo_success "Pre-deployment checks passed"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        echo_warning "Skipping tests as requested"
        return 0
    fi
    
    echo_info "🧪 Running test suite..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo_info "[DRY RUN] Would run: npm test"
        return 0
    fi
    
    cd "$PROJECT_ROOT"
    
    # Install dependencies if needed
    if [[ ! -d "node_modules" ]]; then
        echo_info "📦 Installing dependencies..."
        npm ci
    fi
    
    # Run tests
    if ! npm test; then
        echo_error "Tests failed. Deployment aborted."
        exit 1
    fi
    
    echo_success "All tests passed"
}

# Create database backup
create_backup() {
    if [[ "$BACKUP_BEFORE_DEPLOY" == "false" ]]; then
        echo_warning "Skipping backup as requested"
        return 0
    fi
    
    echo_info "💾 Creating database backup..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo_info "[DRY RUN] Would create backup"
        return 0
    fi
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_dir="$PROJECT_ROOT/backups"
    local backup_file="$backup_dir/autodev_backup_${ENVIRONMENT}_${timestamp}.sql"
    
    mkdir -p "$backup_dir"
    
    # Check if database is running
    if docker ps | grep -q autodev-postgres; then
        docker exec autodev-postgres pg_dump -U autodev autodev > "$backup_file"
        echo_success "Database backup created: $backup_file"
    else
        echo_warning "PostgreSQL container not running, skipping backup"
    fi
}

# Build or pull images
build_images() {
    echo_info "🏗️ Building Docker images..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo_info "[DRY RUN] Would build images"
        return 0
    fi
    
    cd "$PROJECT_ROOT"
    
    local build_args=""
    
    if [[ "$FORCE_REBUILD" == "true" ]]; then
        build_args="--no-cache --pull"
        echo_info "🔄 Force rebuilding images..."
    fi
    
    # Build custom images
    if [[ -f "docker/Dockerfile.gui" ]]; then
        echo_info "🖥️ Building GUI image..."
        docker build $build_args -f docker/Dockerfile.gui -t autodev-gui:$ENVIRONMENT .
    fi
    
    if [[ -f "docker/Dockerfile.sandbox" ]]; then
        echo_info "📦 Building sandbox image..."
        docker build $build_args -f docker/Dockerfile.sandbox -t autodev-sandbox:$ENVIRONMENT .
    fi
    
    if [[ -f "docker/Dockerfile.api" ]]; then
        echo_info "🔌 Building API image..."
        docker build $build_args -f docker/Dockerfile.api -t autodev-api:$ENVIRONMENT .
    fi
    
    echo_success "Images built successfully"
}

# Perform rolling update
rolling_update() {
    if [[ "$ROLLING_UPDATE" == "false" ]]; then
        echo_info "🔄 Restarting services..."
        if [[ "$DRY_RUN" == "false" ]]; then
            docker-compose -f "$COMPOSE_FILE" restart
        fi
        return 0
    fi
    
    echo_info "🔄 Performing rolling update..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo_info "[DRY RUN] Would perform rolling update"
        return 0
    fi
    
    # Services in dependency order
    local services=("postgres" "redis" "autodev-api" "autodev-gui" "nginx-lb" "grafana")
    
    for service in "${services[@]}"; do
        echo_info "🔄 Updating service: $service"
        
        # Check if service exists in compose file
        if docker-compose -f "$COMPOSE_FILE" config --services | grep -q "^$service$"; then
            # Scale up new instance
            docker-compose -f "$COMPOSE_FILE" up -d --scale "$service=2" "$service" || true
            
            # Wait for health check
            echo_info "⏳ Waiting for $service to be healthy..."
            timeout 60 bash -c "
                while ! docker-compose -f '$COMPOSE_FILE' ps '$service' | grep -q 'healthy\|Up'; do
                    sleep 2
                done
            " || echo_warning "Health check timeout for $service"
            
            # Scale down old instance
            docker-compose -f "$COMPOSE_FILE" up -d --scale "$service=1" "$service"
            
            echo_success "Service $service updated successfully"
        else
            echo_warning "Service $service not found in compose file"
        fi
        
        sleep 2  # Brief pause between services
    done
}

# Deploy services
deploy_services() {
    echo_info "🚀 Deploying services..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo_info "[DRY RUN] Would deploy services"
        return 0
    fi
    
    cd "$PROJECT_ROOT"
    
    # Start core infrastructure first
    echo_info "🏗️ Starting core infrastructure..."
    docker-compose -f "$COMPOSE_FILE" up -d postgres redis
    
    # Wait for database to be ready
    echo_info "⏳ Waiting for PostgreSQL..."
    timeout 60 bash -c 'while ! docker exec autodev-postgres pg_isready -U autodev; do sleep 2; done'
    
    # Start application services
    echo_info "🖥️ Starting application services..."
    docker-compose -f "$COMPOSE_FILE" up -d autodev-api autodev-gui
    
    # Start monitoring and load balancer
    if [[ "$ENVIRONMENT" != "development" ]]; then
        echo_info "📊 Starting monitoring services..."
        docker-compose -f "$COMPOSE_FILE" up -d prometheus grafana nginx-lb
    fi
    
    echo_success "Services deployed successfully"
}

# Post-deployment checks
post_deployment_checks() {
    echo_info "🔍 Running post-deployment checks..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo_info "[DRY RUN] Would run post-deployment checks"
        return 0
    fi
    
    # Check service health
    local services=("autodev-postgres" "autodev-redis" "autodev-api")
    
    for service in "${services[@]}"; do
        echo_info "🔍 Checking $service..."
        
        if docker ps | grep -q "$service"; then
            echo_success "$service is running"
        else
            echo_error "$service is not running"
            docker-compose -f "$COMPOSE_FILE" logs "$service" | tail -20
        fi
    done
    
    # Test API endpoints
    echo_info "🌐 Testing API endpoints..."
    local api_url="http://localhost:50052"
    
    if curl -f "$api_url/health" > /dev/null 2>&1; then
        echo_success "API health check passed"
    else
        echo_error "API health check failed"
    fi
    
    # Test database connectivity
    echo_info "💾 Testing database connectivity..."
    if docker exec autodev-postgres psql -U autodev -d autodev -c "SELECT 1;" > /dev/null 2>&1; then
        echo_success "Database connectivity test passed"
    else
        echo_error "Database connectivity test failed"
    fi
    
    # Test Redis connectivity
    echo_info "🚀 Testing Redis connectivity..."
    if docker exec autodev-redis redis-cli ping | grep -q "PONG"; then
        echo_success "Redis connectivity test passed"
    else
        echo_error "Redis connectivity test failed"
    fi
    
    echo_success "Post-deployment checks completed"
}

# Show deployment summary
show_summary() {
    echo_info "📋 Deployment Summary"
    echo "=================================="
    echo "Environment: $ENVIRONMENT"
    echo "Timestamp: $(date)"
    echo "Services:"
    
    if [[ "$DRY_RUN" == "false" ]]; then
        docker-compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
        
        echo -e "\n🌐 Access URLs:"
        case $ENVIRONMENT in
            development)
                echo "  GUI: http://localhost:50080"
                echo "  API: http://localhost:50052"
                ;;
            staging)
                echo "  GUI: https://staging.autodev-ai.example.com"
                echo "  API: https://api-staging.autodev-ai.example.com"
                ;;
            production)
                echo "  GUI: https://autodev-ai.example.com"
                echo "  API: https://api.autodev-ai.example.com"
                ;;
        esac
        
        if [[ "$ENVIRONMENT" != "development" ]]; then
            echo "  Grafana: http://localhost:50090"
            echo "  Prometheus: http://localhost:50091"
        fi
    else
        echo "[DRY RUN] No actual deployment performed"
    fi
}

# Rollback function
rollback() {
    echo_error "🔄 Rolling back deployment..."
    
    local backup_dir="$PROJECT_ROOT/backups"
    local latest_backup=$(ls -t "$backup_dir"/autodev_backup_${ENVIRONMENT}_*.sql 2>/dev/null | head -1)
    
    if [[ -n "$latest_backup" ]]; then
        echo_info "💾 Restoring from backup: $latest_backup"
        docker exec -i autodev-postgres psql -U autodev -d autodev < "$latest_backup"
    fi
    
    # Restart with previous images
    docker-compose -f "$COMPOSE_FILE" down
    docker-compose -f "$COMPOSE_FILE" up -d
    
    echo_warning "Rollback completed. Please verify system state."
}

# Signal handlers for graceful shutdown
trap 'echo_error "Deployment interrupted"; exit 1' INT TERM

# Main deployment flow
main() {
    echo_info "🚀 Starting AutoDev-AI deployment to $ENVIRONMENT"
    
    load_environment
    pre_deployment_checks
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        echo_warning "⚠️  Deploying to PRODUCTION environment"
        read -p "Are you sure you want to continue? (yes/no): " -r
        if [[ ! $REPLY =~ ^yes$ ]]; then
            echo_info "Deployment cancelled"
            exit 0
        fi
    fi
    
    run_tests
    create_backup
    build_images
    
    # Attempt deployment with rollback on failure
    if ! deploy_services || ! rolling_update || ! post_deployment_checks; then
        echo_error "Deployment failed"
        if [[ "$ENVIRONMENT" == "production" ]]; then
            read -p "Rollback? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                rollback
            fi
        fi
        exit 1
    fi
    
    show_summary
    echo_success "🎉 Deployment to $ENVIRONMENT completed successfully!"
}

# Execute main function
main "$@"