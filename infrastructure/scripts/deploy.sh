#!/bin/bash

# AutoDev-AI Deployment Script
# Deploys the complete AutoDev-AI infrastructure using Docker Compose or Kubernetes

set -e

# Configuration
DEPLOY_TYPE="${1:-docker}"  # docker, kubernetes, terraform
ENVIRONMENT="${2:-prod}"
DOMAIN="${3:-autodev.ai}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
INFRA_DIR="$PROJECT_ROOT/infrastructure"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_step() { echo -e "${PURPLE}🚀 $1${NC}"; }

print_banner() {
    echo -e "${CYAN}"
    cat << "EOF"
    ╔══════════════════════════════════════════════════════════╗
    ║                   AutoDev-AI Platform                    ║
    ║                 Infrastructure Deployment                ║
    ╚══════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

show_usage() {
    echo "Usage: $0 [deploy_type] [environment] [domain]"
    echo ""
    echo "Deploy Types:"
    echo "  docker     - Deploy using Docker Compose (default)"
    echo "  kubernetes - Deploy to Kubernetes cluster"
    echo "  terraform  - Deploy infrastructure using Terraform"
    echo ""
    echo "Environments:"
    echo "  dev        - Development environment"
    echo "  staging    - Staging environment"
    echo "  prod       - Production environment (default)"
    echo ""
    echo "Examples:"
    echo "  $0 docker dev localhost"
    echo "  $0 kubernetes prod autodev.ai"
    echo "  $0 terraform prod autodev.ai"
    exit 1
}

check_prerequisites() {
    log_step "Checking prerequisites..."
    
    case $DEPLOY_TYPE in
        docker)
            if ! command -v docker &> /dev/null; then
                log_error "Docker is required but not installed"
                exit 1
            fi
            if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
                log_error "Docker Compose is required but not installed"
                exit 1
            fi
            log_success "Docker prerequisites satisfied"
            ;;
        kubernetes)
            if ! command -v kubectl &> /dev/null; then
                log_error "kubectl is required but not installed"
                exit 1
            fi
            if ! kubectl cluster-info &> /dev/null; then
                log_error "No Kubernetes cluster connection found"
                exit 1
            fi
            log_success "Kubernetes prerequisites satisfied"
            ;;
        terraform)
            if ! command -v terraform &> /dev/null; then
                log_error "Terraform is required but not installed"
                exit 1
            fi
            if ! command -v aws &> /dev/null; then
                log_error "AWS CLI is required but not installed"
                exit 1
            fi
            log_success "Terraform prerequisites satisfied"
            ;;
    esac
}

setup_environment() {
    log_step "Setting up environment configuration..."
    
    # Create environment file
    ENV_FILE="$PROJECT_ROOT/.env.${ENVIRONMENT}"
    
    if [[ ! -f "$ENV_FILE" ]]; then
        log_info "Creating environment file: $ENV_FILE"
        cat > "$ENV_FILE" << EOF
# AutoDev-AI Environment Configuration - ${ENVIRONMENT}
NODE_ENV=${ENVIRONMENT}
DOMAIN=${DOMAIN}
PORT=50060

# Database Configuration
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=autodevai
DATABASE_USER=autodevai
DATABASE_PASSWORD=autodevai_secure_2024
DATABASE_URL=postgresql://autodevai:autodevai_secure_2024@postgres:5432/autodevai

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=autodevai_redis_2024
REDIS_URL=redis://:autodevai_redis_2024@redis:6379

# Security
JWT_SECRET=autodevai_jwt_secret_2024_$(openssl rand -hex 16)

# API Keys (replace with actual values)
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
OPENAI_API_KEY=sk-your-key-here

# Sandbox Configuration
SANDBOX_PORT_RANGE_START=50010
SANDBOX_PORT_RANGE_END=50089
MAX_CONCURRENT_SANDBOXES=80

# Monitoring
GRAFANA_ADMIN_PASSWORD=autodevai_grafana_2024
EOF
        log_success "Environment file created"
    else
        log_info "Environment file already exists: $ENV_FILE"
    fi
}

generate_ssl_certificates() {
    log_step "Generating SSL certificates..."
    
    if [[ ! -f "$INFRA_DIR/ssl/certs/${DOMAIN}.crt" ]]; then
        chmod +x "$INFRA_DIR/ssl/generate-certs.sh"
        "$INFRA_DIR/ssl/generate-certs.sh" "$DOMAIN"
        log_success "SSL certificates generated"
    else
        log_info "SSL certificates already exist"
    fi
}

deploy_docker() {
    log_step "Deploying with Docker Compose..."
    
    cd "$INFRA_DIR/docker"
    
    # Build images if they don't exist
    log_info "Building Docker images..."
    docker-compose build --parallel
    
    # Start services
    log_info "Starting services..."
    docker-compose --env-file "$PROJECT_ROOT/.env.${ENVIRONMENT}" up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 30
    
    # Check service health
    log_info "Checking service health..."
    docker-compose ps
    
    # Run database migrations
    log_info "Running database initialization..."
    docker-compose exec -T postgres psql -U autodevai -d autodevai -f /docker-entrypoint-initdb.d/init.sql || log_warning "Database already initialized"
    
    log_success "Docker deployment completed!"
    
    echo ""
    log_info "Service URLs:"
    echo "  🌐 Main Application: http://localhost:50060"
    echo "  🔍 Direct GUI: http://localhost:50000"
    echo "  🗄️  PostgreSQL: localhost:50050"
    echo "  📦 Redis: localhost:50051"
    echo "  📊 Grafana: http://localhost:50090"
}

deploy_kubernetes() {
    log_step "Deploying to Kubernetes..."
    
    # Create namespace
    log_info "Creating namespace..."
    kubectl apply -f "$INFRA_DIR/kubernetes/namespace.yaml"
    
    # Apply ConfigMaps and Secrets
    log_info "Applying configuration..."
    kubectl apply -f "$INFRA_DIR/kubernetes/configmaps.yaml"
    kubectl apply -f "$INFRA_DIR/kubernetes/secrets.yaml"
    
    # Apply SSL certificates
    if [[ -f "$INFRA_DIR/ssl/certs/tls-secret.yaml" ]]; then
        kubectl apply -f "$INFRA_DIR/ssl/certs/tls-secret.yaml"
    fi
    
    # Deploy database
    log_info "Deploying PostgreSQL..."
    kubectl apply -f "$INFRA_DIR/kubernetes/postgres.yaml"
    
    # Wait for database
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=postgres -n autodevai --timeout=300s
    
    # Deploy Redis
    log_info "Deploying Redis..."
    kubectl apply -f "$INFRA_DIR/kubernetes/redis.yaml"
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=redis -n autodevai --timeout=300s
    
    # Deploy application
    log_info "Deploying AutoDev-AI GUI..."
    kubectl apply -f "$INFRA_DIR/kubernetes/autodevai-gui.yaml"
    
    # Deploy sandbox manager
    log_info "Deploying Sandbox Manager..."
    kubectl apply -f "$INFRA_DIR/kubernetes/sandbox-manager.yaml"
    
    # Deploy Nginx proxy
    log_info "Deploying Nginx proxy..."
    kubectl apply -f "$INFRA_DIR/kubernetes/nginx.yaml"
    
    # Deploy monitoring
    log_info "Deploying monitoring stack..."
    kubectl apply -f "$INFRA_DIR/kubernetes/monitoring.yaml"
    
    # Wait for deployments
    log_info "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available deployment --all -n autodevai --timeout=600s
    
    # Get service information
    log_info "Getting service information..."
    kubectl get services -n autodevai
    
    log_success "Kubernetes deployment completed!"
    
    # Get LoadBalancer IP/hostname
    LB_IP=$(kubectl get service nginx-service -n autodevai -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    LB_HOSTNAME=$(kubectl get service nginx-service -n autodevai -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
    
    echo ""
    log_info "Service URLs:"
    if [[ -n "$LB_IP" ]]; then
        echo "  🌐 Application: http://$LB_IP:50060"
    elif [[ -n "$LB_HOSTNAME" ]]; then
        echo "  🌐 Application: http://$LB_HOSTNAME:50060"
    fi
    echo "  🔍 Port-forward for local access:"
    echo "    kubectl port-forward service/nginx-service 50060:50060 -n autodevai"
}

deploy_terraform() {
    log_step "Deploying with Terraform..."
    
    cd "$INFRA_DIR/terraform"
    
    # Initialize Terraform
    log_info "Initializing Terraform..."
    terraform init
    
    # Plan deployment
    log_info "Planning Terraform deployment..."
    terraform plan -var="environment=${ENVIRONMENT}" -var="domain_name=${DOMAIN}"
    
    # Apply deployment
    log_info "Applying Terraform deployment..."
    terraform apply -var="environment=${ENVIRONMENT}" -var="domain_name=${DOMAIN}" -auto-approve
    
    # Configure kubectl
    log_info "Configuring kubectl..."
    aws eks --region $(terraform output -raw aws_region) update-kubeconfig --name $(terraform output -raw eks_cluster_id)
    
    # Deploy Kubernetes manifests
    log_info "Deploying Kubernetes manifests..."
    deploy_kubernetes
    
    log_success "Terraform deployment completed!"
    
    echo ""
    log_info "Terraform Outputs:"
    terraform output
}

setup_monitoring() {
    log_step "Setting up monitoring and health checks..."
    
    case $DEPLOY_TYPE in
        docker)
            log_info "Docker monitoring setup..."
            # Add Docker-specific monitoring setup
            ;;
        kubernetes)
            log_info "Kubernetes monitoring setup..."
            # Monitoring is part of the Kubernetes manifests
            ;;
        terraform)
            log_info "AWS monitoring setup..."
            # AWS monitoring is part of the Terraform configuration
            ;;
    esac
}

run_health_checks() {
    log_step "Running health checks..."
    
    case $DEPLOY_TYPE in
        docker)
            log_info "Checking Docker services..."
            docker-compose ps
            log_info "Testing main application..."
            curl -f http://localhost:50060/health || log_warning "Health check failed"
            ;;
        kubernetes)
            log_info "Checking Kubernetes pods..."
            kubectl get pods -n autodevai
            log_info "Checking services..."
            kubectl get services -n autodevai
            ;;
        terraform)
            log_info "Checking AWS resources..."
            terraform show
            ;;
    esac
}

cleanup() {
    log_step "Cleaning up temporary files..."
    # Add cleanup logic if needed
}

main() {
    print_banner
    
    # Validate arguments
    if [[ "$1" == "-h" || "$1" == "--help" ]]; then
        show_usage
    fi
    
    if [[ ! "$DEPLOY_TYPE" =~ ^(docker|kubernetes|terraform)$ ]]; then
        log_error "Invalid deploy type: $DEPLOY_TYPE"
        show_usage
    fi
    
    if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
        log_error "Invalid environment: $ENVIRONMENT"
        show_usage
    fi
    
    log_info "Deployment Configuration:"
    echo "  📦 Deploy Type: $DEPLOY_TYPE"
    echo "  🌍 Environment: $ENVIRONMENT"
    echo "  🌐 Domain: $DOMAIN"
    echo ""
    
    # Execute deployment steps
    check_prerequisites
    setup_environment
    
    if [[ "$DEPLOY_TYPE" != "terraform" ]]; then
        generate_ssl_certificates
    fi
    
    case $DEPLOY_TYPE in
        docker)
            deploy_docker
            ;;
        kubernetes)
            deploy_kubernetes
            ;;
        terraform)
            deploy_terraform
            ;;
    esac
    
    setup_monitoring
    run_health_checks
    cleanup
    
    log_success "🎉 AutoDev-AI deployment completed successfully!"
    
    echo ""
    echo "📋 Next Steps:"
    echo "  1. Update your DNS settings to point to the deployed services"
    echo "  2. Configure your API keys in the environment variables"
    echo "  3. Set up monitoring alerts and notifications"
    echo "  4. Review security settings and access controls"
    echo "  5. Perform load testing and performance optimization"
    echo ""
    log_info "For troubleshooting, check the logs and service status"
}

# Handle script interruption
trap cleanup EXIT

# Run main function
main "$@"