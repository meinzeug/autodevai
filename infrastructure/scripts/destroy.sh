#!/bin/bash

# AutoDev-AI Infrastructure Destruction Script
# Safely destroys the AutoDev-AI infrastructure components

set -e

# Configuration
DEPLOY_TYPE="${1:-docker}"  # docker, kubernetes, terraform
ENVIRONMENT="${2:-prod}"
FORCE="${3:-false}"
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
log_step() { echo -e "${PURPLE}🔥 $1${NC}"; }

print_banner() {
    echo -e "${RED}"
    cat << "EOF"
    ╔══════════════════════════════════════════════════════════╗
    ║                   ⚠️  DANGER ZONE ⚠️                     ║
    ║                AutoDev-AI Infrastructure                 ║
    ║                    DESTRUCTION SCRIPT                    ║
    ╚══════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

show_usage() {
    echo "Usage: $0 [deploy_type] [environment] [force]"
    echo ""
    echo "Deploy Types:"
    echo "  docker     - Destroy Docker Compose deployment"
    echo "  kubernetes - Destroy Kubernetes deployment"
    echo "  terraform  - Destroy Terraform infrastructure"
    echo ""
    echo "Environments:"
    echo "  dev        - Development environment"
    echo "  staging    - Staging environment"
    echo "  prod       - Production environment"
    echo ""
    echo "Force:"
    echo "  true       - Skip confirmation prompts"
    echo "  false      - Require confirmation (default)"
    echo ""
    echo "Examples:"
    echo "  $0 docker dev"
    echo "  $0 kubernetes prod"
    echo "  $0 terraform prod true"
    exit 1
}

confirm_destruction() {
    if [[ "$FORCE" == "true" ]]; then
        return 0
    fi
    
    echo -e "${RED}"
    echo "🚨 WARNING: This will completely destroy the AutoDev-AI infrastructure!"
    echo "📊 Deploy Type: $DEPLOY_TYPE"
    echo "🌍 Environment: $ENVIRONMENT"
    echo ""
    echo "This action will:"
    case $DEPLOY_TYPE in
        docker)
            echo "  - Stop and remove all Docker containers"
            echo "  - Remove Docker volumes and data"
            echo "  - Remove Docker networks"
            echo "  - Delete local data and logs"
            ;;
        kubernetes)
            echo "  - Delete all Kubernetes resources in autodevai namespace"
            echo "  - Remove persistent volumes and data"
            echo "  - Delete secrets and configmaps"
            echo "  - Remove the entire namespace"
            ;;
        terraform)
            echo "  - Destroy all AWS resources"
            echo "  - Delete EKS cluster and node groups"
            echo "  - Remove RDS databases (with final snapshots)"
            echo "  - Delete VPC and networking components"
            echo "  - Remove all associated AWS resources"
            ;;
    esac
    echo -e "${NC}"
    
    read -p "Are you absolutely sure you want to proceed? (type 'yes' to confirm): " confirmation
    
    if [[ "$confirmation" != "yes" ]]; then
        log_info "Destruction cancelled by user"
        exit 0
    fi
    
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        echo -e "${RED}⚠️  This is a PRODUCTION environment!${NC}"
        read -p "Type 'DESTROY PRODUCTION' to confirm: " prod_confirmation
        
        if [[ "$prod_confirmation" != "DESTROY PRODUCTION" ]]; then
            log_info "Production destruction cancelled"
            exit 0
        fi
    fi
}

backup_data() {
    if [[ "$DEPLOY_TYPE" == "docker" && "$FORCE" != "true" ]]; then
        log_step "Creating backup of Docker volumes..."
        
        BACKUP_DIR="$PROJECT_ROOT/backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        
        # Backup database
        if docker-compose -f "$INFRA_DIR/docker/docker-compose.yml" ps postgres | grep -q "Up"; then
            log_info "Backing up PostgreSQL database..."
            docker-compose -f "$INFRA_DIR/docker/docker-compose.yml" exec -T postgres pg_dump -U autodevai autodevai > "$BACKUP_DIR/postgres_backup.sql"
            log_success "Database backup created: $BACKUP_DIR/postgres_backup.sql"
        fi
        
        # Backup Redis data
        if docker-compose -f "$INFRA_DIR/docker/docker-compose.yml" ps redis | grep -q "Up"; then
            log_info "Backing up Redis data..."
            docker-compose -f "$INFRA_DIR/docker/docker-compose.yml" exec -T redis redis-cli BGSAVE
            sleep 5
            docker cp $(docker-compose -f "$INFRA_DIR/docker/docker-compose.yml" ps -q redis):/data/dump.rdb "$BACKUP_DIR/redis_dump.rdb" 2>/dev/null || log_warning "Redis backup failed"
        fi
        
        log_success "Backup completed: $BACKUP_DIR"
    fi
}

destroy_docker() {
    log_step "Destroying Docker Compose deployment..."
    
    cd "$INFRA_DIR/docker"
    
    # Stop and remove containers
    log_info "Stopping containers..."
    docker-compose down --remove-orphans || log_warning "Some containers may already be stopped"
    
    # Remove volumes
    log_info "Removing volumes..."
    docker-compose down -v || log_warning "Some volumes may already be removed"
    
    # Remove images
    read -p "Remove Docker images as well? (y/n): " remove_images
    if [[ "$remove_images" == "y" ]]; then
        log_info "Removing Docker images..."
        docker-compose down --rmi all || log_warning "Some images may be in use"
    fi
    
    # Clean up orphaned containers and networks
    log_info "Cleaning up Docker system..."
    docker system prune -f
    
    log_success "Docker deployment destroyed"
}

destroy_kubernetes() {
    log_step "Destroying Kubernetes deployment..."
    
    # Check if namespace exists
    if ! kubectl get namespace autodevai &>/dev/null; then
        log_warning "Namespace 'autodevai' does not exist"
        return 0
    fi
    
    # Scale down deployments to avoid graceful shutdown delays
    log_info "Scaling down deployments..."
    kubectl scale deployment --all --replicas=0 -n autodevai || log_warning "Failed to scale some deployments"
    
    # Delete all resources in namespace
    log_info "Deleting all resources in autodevai namespace..."
    kubectl delete all --all -n autodevai --timeout=300s || log_warning "Some resources may still be terminating"
    
    # Delete persistent volume claims
    log_info "Deleting persistent volume claims..."
    kubectl delete pvc --all -n autodevai || log_warning "No PVCs to delete"
    
    # Delete secrets and configmaps
    log_info "Deleting secrets and configmaps..."
    kubectl delete secrets --all -n autodevai || log_warning "No secrets to delete"
    kubectl delete configmaps --all -n autodevai || log_warning "No configmaps to delete"
    
    # Delete the namespace
    log_info "Deleting namespace..."
    kubectl delete namespace autodevai --timeout=300s || log_warning "Namespace deletion may be stuck"
    
    # Clean up cluster-wide resources
    log_info "Cleaning up cluster-wide resources..."
    kubectl delete clusterissuer letsencrypt-staging letsencrypt-prod --ignore-not-found
    kubectl delete certificaterequests --all --ignore-not-found
    
    # Remove cert-manager if it was installed
    read -p "Remove cert-manager? (y/n): " remove_certmanager
    if [[ "$remove_certmanager" == "y" ]]; then
        log_info "Removing cert-manager..."
        helm uninstall cert-manager -n cert-manager || log_warning "cert-manager may not be installed via Helm"
        kubectl delete namespace cert-manager --ignore-not-found
    fi
    
    # Remove ingress-nginx if it was installed
    read -p "Remove ingress-nginx? (y/n): " remove_ingress
    if [[ "$remove_ingress" == "y" ]]; then
        log_info "Removing ingress-nginx..."
        helm uninstall ingress-nginx -n ingress-nginx || log_warning "ingress-nginx may not be installed via Helm"
        kubectl delete namespace ingress-nginx --ignore-not-found
    fi
    
    log_success "Kubernetes deployment destroyed"
}

destroy_terraform() {
    log_step "Destroying Terraform infrastructure..."
    
    cd "$INFRA_DIR/terraform"
    
    # First destroy Kubernetes resources to avoid hanging Terraform destroy
    log_info "Destroying Kubernetes resources first..."
    if kubectl get namespace autodevai &>/dev/null; then
        destroy_kubernetes
    fi
    
    # Create final snapshots for production
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        log_info "Creating final snapshots for production resources..."
        # This is handled by Terraform's deletion_protection and final_snapshot settings
    fi
    
    # Plan destruction
    log_info "Planning Terraform destruction..."
    terraform plan -destroy -var="environment=${ENVIRONMENT}" -out=destroy.plan
    
    # Apply destruction
    log_info "Applying Terraform destruction..."
    terraform apply destroy.plan
    
    # Clean up Terraform state and files
    read -p "Remove Terraform state files? (y/n): " remove_state
    if [[ "$remove_state" == "y" ]]; then
        log_warning "Removing Terraform state files..."
        rm -f terraform.tfstate terraform.tfstate.backup destroy.plan .terraform.lock.hcl
        rm -rf .terraform/
    fi
    
    log_success "Terraform infrastructure destroyed"
}

cleanup_local_files() {
    log_step "Cleaning up local files..."
    
    read -p "Remove SSL certificates? (y/n): " remove_certs
    if [[ "$remove_certs" == "y" ]]; then
        log_info "Removing SSL certificates..."
        rm -rf "$INFRA_DIR/ssl/certs/"
    fi
    
    read -p "Remove environment files? (y/n): " remove_env
    if [[ "$remove_env" == "y" ]]; then
        log_info "Removing environment files..."
        rm -f "$PROJECT_ROOT/.env.*"
    fi
    
    read -p "Remove log files? (y/n): " remove_logs
    if [[ "$remove_logs" == "y" ]]; then
        log_info "Removing log files..."
        find "$PROJECT_ROOT" -name "*.log" -type f -delete
    fi
    
    log_success "Local cleanup completed"
}

verify_destruction() {
    log_step "Verifying destruction..."
    
    case $DEPLOY_TYPE in
        docker)
            log_info "Checking remaining Docker resources..."
            docker-compose -f "$INFRA_DIR/docker/docker-compose.yml" ps || log_info "No containers running"
            docker volume ls | grep autodevai || log_info "No autodevai volumes found"
            ;;
        kubernetes)
            log_info "Checking remaining Kubernetes resources..."
            kubectl get namespace autodevai 2>/dev/null || log_info "Namespace autodevai not found"
            kubectl get pv | grep autodevai || log_info "No autodevai persistent volumes found"
            ;;
        terraform)
            log_info "Checking AWS resources..."
            cd "$INFRA_DIR/terraform"
            terraform show || log_info "No Terraform state found"
            ;;
    esac
    
    log_success "Destruction verification completed"
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
    
    log_warning "Destruction Configuration:"
    echo "  🔥 Deploy Type: $DEPLOY_TYPE"
    echo "  🌍 Environment: $ENVIRONMENT"
    echo "  ⚡ Force Mode: $FORCE"
    echo ""
    
    # Confirm destruction
    confirm_destruction
    
    # Create backup if needed
    backup_data
    
    # Execute destruction
    case $DEPLOY_TYPE in
        docker)
            destroy_docker
            ;;
        kubernetes)
            destroy_kubernetes
            ;;
        terraform)
            destroy_terraform
            ;;
    esac
    
    # Clean up local files
    cleanup_local_files
    
    # Verify destruction
    verify_destruction
    
    log_success "🔥 AutoDev-AI infrastructure destruction completed!"
    
    echo ""
    log_info "📋 What was destroyed:"
    echo "  - All running services and containers"
    echo "  - Persistent data and volumes"
    echo "  - Network configurations"
    echo "  - SSL certificates (if selected)"
    echo "  - Environment configurations (if selected)"
    echo ""
    log_warning "Note: Any backups created are still available in the backups directory"
}

# Run main function
main "$@"