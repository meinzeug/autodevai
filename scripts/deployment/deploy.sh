#!/bin/bash

# AutoDev-AI Neural Bridge Production Deployment Script
# Version: 2.0.0
# Security-enhanced deployment with comprehensive monitoring

set -euo pipefail

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-production}"
readonly KUBE_NAMESPACE="${KUBE_NAMESPACE:-autodev-ai}"
readonly DOCKER_REGISTRY="${DOCKER_REGISTRY:-ghcr.io}"
readonly IMAGE_TAG="${IMAGE_TAG:-latest}"
readonly TIMEOUT="${TIMEOUT:-600}"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $*" >&2
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARN:${NC} $*" >&2
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $*" >&2
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $*" >&2
}

# Cleanup function
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        error "Deployment failed with exit code $exit_code"
        rollback_deployment
    fi
}

trap cleanup EXIT

# Validation functions
validate_prerequisites() {
    log "Validating deployment prerequisites..."
    
    local missing_tools=()
    
    for tool in kubectl docker jq curl; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi
    
    # Validate Kubernetes access
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Validate Docker registry access
    if ! docker pull hello-world &> /dev/null; then
        error "Cannot pull from Docker registry"
        exit 1
    fi
    
    # Validate required environment variables
    local required_vars=(
        "DATABASE_URL"
        "REDIS_URL" 
        "OPENAI_API_KEY"
        "ANTHROPIC_API_KEY"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    success "Prerequisites validated successfully"
}

# Create Kubernetes secrets
create_secrets() {
    log "Creating Kubernetes secrets..."
    
    kubectl create namespace "$KUBE_NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    # Create main secrets
    kubectl create secret generic autodev-ai-secrets \
        --namespace="$KUBE_NAMESPACE" \
        --from-literal=database-url="$DATABASE_URL" \
        --from-literal=redis-url="$REDIS_URL" \
        --from-literal=openai-api-key="$OPENAI_API_KEY" \
        --from-literal=anthropic-api-key="$ANTHROPIC_API_KEY" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Create TLS secrets if certificates exist
    if [[ -f "$PROJECT_ROOT/ssl/tls.crt" && -f "$PROJECT_ROOT/ssl/tls.key" ]]; then
        kubectl create secret tls autodev-ai-tls \
            --namespace="$KUBE_NAMESPACE" \
            --cert="$PROJECT_ROOT/ssl/tls.crt" \
            --key="$PROJECT_ROOT/ssl/tls.key" \
            --dry-run=client -o yaml | kubectl apply -f -
    fi
    
    success "Secrets created successfully"
}

# Create ConfigMaps
create_configmaps() {
    log "Creating ConfigMaps..."
    
    # Create main configuration
    kubectl create configmap autodev-ai-config \
        --namespace="$KUBE_NAMESPACE" \
        --from-literal=environment="$DEPLOYMENT_ENV" \
        --from-literal=log-level="info" \
        --from-literal=metrics-enabled="true" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    success "ConfigMaps created successfully"
}

# Build and push Docker images
build_and_push_images() {
    log "Building and pushing Docker images..."
    
    cd "$PROJECT_ROOT"
    
    # Build multi-architecture images
    docker buildx create --use --name autodev-ai-builder 2>/dev/null || true
    
    local services=("gui" "api" "sandbox" "all-in-one")
    
    for service in "${services[@]}"; do
        if [[ -f "docker/Dockerfile.$service" ]]; then
            log "Building $service image..."
            
            docker buildx build \
                --platform linux/amd64,linux/arm64 \
                --file "docker/Dockerfile.$service" \
                --tag "$DOCKER_REGISTRY/autodev-ai/autodev-ai-$service:$IMAGE_TAG" \
                --push \
                --build-arg VERSION="$IMAGE_TAG" \
                --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
                --build-arg VCS_REF="$(git rev-parse HEAD)" \
                .
            
            success "$service image built and pushed"
        else
            warn "Dockerfile.$service not found, skipping"
        fi
    done
}

# Deploy to Kubernetes
deploy_kubernetes() {
    log "Deploying to Kubernetes..."
    
    cd "$PROJECT_ROOT"
    
    # Apply manifests in order
    local manifests=(
        "k8s/namespace.yaml"
        "k8s/deployment.yaml" 
        "k8s/service.yaml"
        "k8s/ingress.yaml"
        "k8s/monitoring.yaml"
    )
    
    for manifest in "${manifests[@]}"; do
        if [[ -f "$manifest" ]]; then
            log "Applying $manifest..."
            
            # Substitute environment variables
            envsubst < "$manifest" | kubectl apply -f -
            
            success "$manifest applied"
        else
            warn "$manifest not found, skipping"
        fi
    done
    
    # Wait for deployment to be ready
    log "Waiting for deployment to be ready..."
    
    kubectl rollout status deployment/autodev-ai-deployment \
        --namespace="$KUBE_NAMESPACE" \
        --timeout="${TIMEOUT}s"
    
    success "Kubernetes deployment completed"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring stack..."
    
    # Install Prometheus Operator if not present
    if ! kubectl get crd prometheuses.monitoring.coreos.com &> /dev/null; then
        log "Installing Prometheus Operator..."
        
        kubectl apply -f https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/main/bundle.yaml
        
        # Wait for operator to be ready
        kubectl wait --for=condition=available --timeout=300s \
            deployment/prometheus-operator -n default
    fi
    
    # Apply monitoring configurations
    kubectl apply -f "$PROJECT_ROOT/k8s/monitoring.yaml"
    
    # Wait for monitoring stack to be ready
    kubectl wait --for=condition=available --timeout=300s \
        deployment/prometheus -n "$KUBE_NAMESPACE" || warn "Prometheus not ready"
        
    kubectl wait --for=condition=available --timeout=300s \
        deployment/grafana -n "$KUBE_NAMESPACE" || warn "Grafana not ready"
    
    success "Monitoring stack deployed"
}

# Health checks
run_health_checks() {
    log "Running health checks..."
    
    local endpoints=(
        "http://app.autodev-ai.com/health"
        "http://api.autodev-ai.com/health"
        "http://sandbox.autodev-ai.com/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        log "Checking $endpoint..."
        
        local retries=5
        local count=0
        
        while [[ $count -lt $retries ]]; do
            if curl -f -s "$endpoint" &> /dev/null; then
                success "$endpoint is healthy"
                break
            fi
            
            ((count++))
            if [[ $count -lt $retries ]]; then
                warn "$endpoint not ready, retrying in 30s... ($count/$retries)"
                sleep 30
            else
                error "$endpoint health check failed after $retries attempts"
                return 1
            fi
        done
    done
    
    success "All health checks passed"
}

# Performance tests
run_performance_tests() {
    log "Running performance tests..."
    
    cd "$PROJECT_ROOT"
    
    if [[ -f "scripts/performance/load-test.sh" ]]; then
        bash scripts/performance/load-test.sh
    else
        warn "Performance test script not found, skipping"
    fi
}

# Rollback deployment
rollback_deployment() {
    warn "Rolling back deployment..."
    
    kubectl rollout undo deployment/autodev-ai-deployment \
        --namespace="$KUBE_NAMESPACE" || true
    
    kubectl rollout status deployment/autodev-ai-deployment \
        --namespace="$KUBE_NAMESPACE" \
        --timeout=300s || true
    
    warn "Rollback completed"
}

# Generate deployment report
generate_report() {
    log "Generating deployment report..."
    
    local report_file="$PROJECT_ROOT/deployment-report-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" << EOF
{
    "deployment": {
        "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
        "environment": "$DEPLOYMENT_ENV",
        "namespace": "$KUBE_NAMESPACE",
        "image_tag": "$IMAGE_TAG",
        "git_commit": "$(git rev-parse HEAD)",
        "deployed_by": "${USER:-unknown}"
    },
    "cluster_info": $(kubectl cluster-info dump --output-directory=/tmp/cluster-info --quiet 2>/dev/null && echo '{"status": "captured"}' || echo '{"status": "failed"}'),
    "pod_status": $(kubectl get pods -n "$KUBE_NAMESPACE" -o json 2>/dev/null || echo '{"status": "failed"}'),
    "service_status": $(kubectl get services -n "$KUBE_NAMESPACE" -o json 2>/dev/null || echo '{"status": "failed"}'),
    "ingress_status": $(kubectl get ingress -n "$KUBE_NAMESPACE" -o json 2>/dev/null || echo '{"status": "failed"}')
}
EOF
    
    success "Deployment report generated: $report_file"
}

# Notification functions
send_notifications() {
    log "Sending deployment notifications..."
    
    local status="${1:-success}"
    local message="AutoDev-AI deployment $status in $DEPLOYMENT_ENV environment"
    
    # Slack notification
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" || warn "Slack notification failed"
    fi
    
    # Email notification (if configured)
    if [[ -n "${NOTIFICATION_EMAIL:-}" ]]; then
        echo "$message" | mail -s "AutoDev-AI Deployment $status" "$NOTIFICATION_EMAIL" || warn "Email notification failed"
    fi
    
    success "Notifications sent"
}

# Main deployment function
main() {
    log "Starting AutoDev-AI deployment to $DEPLOYMENT_ENV environment"
    log "Deployment configuration:"
    log "  - Namespace: $KUBE_NAMESPACE"
    log "  - Registry: $DOCKER_REGISTRY"
    log "  - Image Tag: $IMAGE_TAG"
    log "  - Timeout: ${TIMEOUT}s"
    
    validate_prerequisites
    create_secrets
    create_configmaps
    build_and_push_images
    deploy_kubernetes
    setup_monitoring
    
    # Wait a bit before health checks
    log "Waiting 60 seconds for services to stabilize..."
    sleep 60
    
    run_health_checks
    run_performance_tests
    generate_report
    send_notifications "success"
    
    success "🎉 AutoDev-AI deployment completed successfully!"
    log "Access your application at:"
    log "  - GUI: https://app.autodev-ai.com"
    log "  - API: https://api.autodev-ai.com"
    log "  - Monitoring: https://grafana.autodev-ai.com"
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi