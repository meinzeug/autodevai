#!/bin/bash

# AutoDev-AI Neural Bridge Platform - Docker Build Script
# Step 188: Comprehensive Docker Build Script with Multi-stage Support
# Author: AutoDev-AI DevOps Team
# Version: 1.0.0

set -euo pipefail

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly MAGENTA='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly DOCKER_DIR="$PROJECT_ROOT/docker"
readonly BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
readonly GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
readonly VERSION="${VERSION:-$(grep '"version"' "$PROJECT_ROOT/package.json" | sed 's/.*: *"\([^"]*\)".*/\1/')}"

# Default values
DEFAULT_REGISTRY="ghcr.io/meinzeug"
DEFAULT_IMAGE_NAME="autodevai-neural-bridge"
DEFAULT_BUILD_TYPE="production"
DEFAULT_PLATFORM="linux/amd64"
DEFAULT_PUSH="false"
DEFAULT_CACHE="true"
DEFAULT_HEALTH_CHECK="true"

# Parse command line arguments
usage() {
    echo -e "${CYAN}AutoDev-AI Docker Build Script${NC}"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -t, --type TYPE          Build type: development|production|sandbox|api|gui (default: production)"
    echo "  -r, --registry REGISTRY  Docker registry (default: $DEFAULT_REGISTRY)"
    echo "  -n, --name NAME          Image name (default: $DEFAULT_IMAGE_NAME)"
    echo "  -v, --version VERSION    Image version (default: auto-detected from package.json)"
    echo "  -p, --platform PLATFORM  Target platform (default: $DEFAULT_PLATFORM)"
    echo "  --push                   Push image to registry after build"
    echo "  --no-cache               Disable build cache"
    echo "  --no-health-check        Disable health check in image"
    echo "  --parallel               Build multiple variants in parallel"
    echo "  --prune                  Prune unused Docker objects after build"
    echo "  --scan                   Run security scan after build"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -t production --push"
    echo "  $0 -t development -n my-dev-image"
    echo "  $0 --parallel --push --scan"
    echo ""
}

# Initialize variables with defaults
BUILD_TYPE="$DEFAULT_BUILD_TYPE"
REGISTRY="$DEFAULT_REGISTRY"
IMAGE_NAME="$DEFAULT_IMAGE_NAME"
IMAGE_VERSION="$VERSION"
PLATFORM="$DEFAULT_PLATFORM"
PUSH="$DEFAULT_PUSH"
USE_CACHE="$DEFAULT_CACHE"
HEALTH_CHECK="$DEFAULT_HEALTH_CHECK"
PARALLEL_BUILD="false"
PRUNE_AFTER="false"
SECURITY_SCAN="false"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--type)
            BUILD_TYPE="$2"
            shift 2
            ;;
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        -n|--name)
            IMAGE_NAME="$2"
            shift 2
            ;;
        -v|--version)
            IMAGE_VERSION="$2"
            shift 2
            ;;
        -p|--platform)
            PLATFORM="$2"
            shift 2
            ;;
        --push)
            PUSH="true"
            shift
            ;;
        --no-cache)
            USE_CACHE="false"
            shift
            ;;
        --no-health-check)
            HEALTH_CHECK="false"
            shift
            ;;
        --parallel)
            PARALLEL_BUILD="true"
            shift
            ;;
        --prune)
            PRUNE_AFTER="true"
            shift
            ;;
        --scan)
            SECURITY_SCAN="true"
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}Error: Unknown option $1${NC}" >&2
            usage
            exit 1
            ;;
    esac
done

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

log_step() {
    echo -e "${MAGENTA}[STEP]${NC} $1"
}

# Validation functions
validate_environment() {
    log_step "Validating build environment..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check Docker Buildx for multi-platform support
    if ! docker buildx version &> /dev/null; then
        log_warning "Docker Buildx not available, multi-platform builds will be limited"
    fi
    
    # Check if we're in the right directory
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        log_error "package.json not found. Are you in the project root?"
        exit 1
    fi
    
    # Validate build type
    case "$BUILD_TYPE" in
        development|production|sandbox|api|gui|test-runner)
            ;;
        *)
            log_error "Invalid build type: $BUILD_TYPE"
            log_error "Valid types: development, production, sandbox, api, gui, test-runner"
            exit 1
            ;;
    esac
    
    log_success "Environment validation passed"
}

# Docker file selection
get_dockerfile() {
    local build_type="$1"
    local dockerfile_path
    
    case "$build_type" in
        development)
            dockerfile_path="$DOCKER_DIR/Dockerfile.dev"
            if [[ ! -f "$dockerfile_path" ]]; then
                dockerfile_path="$DOCKER_DIR/Dockerfile"
            fi
            ;;
        production)
            dockerfile_path="$DOCKER_DIR/Dockerfile"
            ;;
        sandbox)
            dockerfile_path="$DOCKER_DIR/Dockerfile.sandbox"
            ;;
        api)
            dockerfile_path="$DOCKER_DIR/Dockerfile.api"
            ;;
        gui)
            dockerfile_path="$DOCKER_DIR/Dockerfile.gui"
            ;;
        test-runner)
            dockerfile_path="$DOCKER_DIR/Dockerfile.sandbox"
            ;;
        *)
            dockerfile_path="$DOCKER_DIR/Dockerfile"
            ;;
    esac
    
    if [[ ! -f "$dockerfile_path" ]]; then
        log_error "Dockerfile not found: $dockerfile_path"
        exit 1
    fi
    
    echo "$dockerfile_path"
}

# Build arguments preparation
prepare_build_args() {
    local build_type="$1"
    local args=()
    
    # Common build arguments
    args+=(--build-arg "BUILD_DATE=$BUILD_DATE")
    args+=(--build-arg "GIT_COMMIT=$GIT_COMMIT")
    args+=(--build-arg "VERSION=$IMAGE_VERSION")
    args+=(--build-arg "BUILD_TYPE=$build_type")
    
    # Type-specific arguments
    case "$build_type" in
        development)
            args+=(--build-arg "NODE_ENV=development")
            args+=(--build-arg "PORT=50010")
            ;;
        production)
            args+=(--build-arg "NODE_ENV=production")
            args+=(--build-arg "PORT=3000")
            ;;
        sandbox)
            args+=(--build-arg "SANDBOX_TYPE=nodejs")
            args+=(--build-arg "ISOLATION_LEVEL=container")
            ;;
        api)
            args+=(--build-arg "SERVICE_TYPE=api")
            args+=(--build-arg "PORT=3001")
            ;;
        gui)
            args+=(--build-arg "SERVICE_TYPE=gui")
            args+=(--build-arg "PORT=3000")
            ;;
    esac
    
    # Cache settings
    if [[ "$USE_CACHE" == "false" ]]; then
        args+=(--no-cache)
    fi
    
    # Health check
    if [[ "$HEALTH_CHECK" == "false" ]]; then
        args+=(--build-arg "DISABLE_HEALTHCHECK=true")
    fi
    
    echo "${args[@]}"
}

# Image tag generation
generate_tags() {
    local build_type="$1"
    local base_name="$REGISTRY/$IMAGE_NAME"
    local tags=()
    
    # Version-specific tag
    tags+=("$base_name:$IMAGE_VERSION-$build_type")
    
    # Latest tag for production
    if [[ "$build_type" == "production" ]]; then
        tags+=("$base_name:latest")
        tags+=("$base_name:$IMAGE_VERSION")
    fi
    
    # Build type tag
    tags+=("$base_name:$build_type")
    
    # Commit-specific tag
    tags+=("$base_name:$GIT_COMMIT-$build_type")
    
    echo "${tags[@]}"
}

# Build single image
build_image() {
    local build_type="$1"
    local dockerfile
    local build_args
    local tags
    local tag_args=()
    
    log_step "Building $build_type image..."
    
    dockerfile=$(get_dockerfile "$build_type")
    build_args=$(prepare_build_args "$build_type")
    read -ra tags <<< "$(generate_tags "$build_type")"
    
    # Prepare tag arguments
    for tag in "${tags[@]}"; do
        tag_args+=(-t "$tag")
    done
    
    # Build command
    local build_cmd=(
        docker build
        --platform "$PLATFORM"
        -f "$dockerfile"
        "${tag_args[@]}"
    )
    
    # Add build args
    read -ra args_array <<< "$build_args"
    build_cmd+=("${args_array[@]}")
    
    # Add context
    build_cmd+=("$PROJECT_ROOT")
    
    log_info "Running: ${build_cmd[*]}"
    
    # Execute build
    if "${build_cmd[@]}"; then
        log_success "Successfully built $build_type image"
        
        # Display tags
        log_info "Generated tags:"
        for tag in "${tags[@]}"; do
            echo "  - $tag"
        done
    else
        log_error "Failed to build $build_type image"
        exit 1
    fi
}

# Push images
push_images() {
    local build_type="$1"
    local tags
    
    if [[ "$PUSH" != "true" ]]; then
        return 0
    fi
    
    log_step "Pushing $build_type images..."
    
    read -ra tags <<< "$(generate_tags "$build_type")"
    
    for tag in "${tags[@]}"; do
        log_info "Pushing $tag..."
        if docker push "$tag"; then
            log_success "Successfully pushed $tag"
        else
            log_error "Failed to push $tag"
            exit 1
        fi
    done
}

# Security scan
security_scan() {
    local build_type="$1"
    
    if [[ "$SECURITY_SCAN" != "true" ]]; then
        return 0
    fi
    
    log_step "Running security scan on $build_type image..."
    
    local primary_tag="$REGISTRY/$IMAGE_NAME:$IMAGE_VERSION-$build_type"
    
    # Try different security scanners
    local scanners=("trivy" "grype" "docker scan")
    local scan_success=false
    
    for scanner in "${scanners[@]}"; do
        if command -v "${scanner%% *}" &> /dev/null; then
            log_info "Running $scanner..."
            case "$scanner" in
                trivy)
                    if trivy image --exit-code 1 --severity HIGH,CRITICAL "$primary_tag"; then
                        scan_success=true
                        break
                    fi
                    ;;
                grype)
                    if grype "$primary_tag" -f critical; then
                        scan_success=true
                        break
                    fi
                    ;;
                "docker scan")
                    if docker scan "$primary_tag"; then
                        scan_success=true
                        break
                    fi
                    ;;
            esac
        fi
    done
    
    if [[ "$scan_success" == "true" ]]; then
        log_success "Security scan passed"
    else
        log_warning "No security scanner available or scan failed"
    fi
}

# Parallel build function
build_parallel() {
    local types=("$@")
    local pids=()
    
    log_step "Starting parallel builds for: ${types[*]}"
    
    for build_type in "${types[@]}"; do
        (
            build_image "$build_type"
            push_images "$build_type"
            security_scan "$build_type"
        ) &
        pids+=($!)
    done
    
    # Wait for all builds to complete
    local failed=false
    for pid in "${pids[@]}"; do
        if ! wait "$pid"; then
            failed=true
        fi
    done
    
    if [[ "$failed" == "true" ]]; then
        log_error "One or more parallel builds failed"
        exit 1
    fi
    
    log_success "All parallel builds completed successfully"
}

# Cleanup function
cleanup() {
    if [[ "$PRUNE_AFTER" == "true" ]]; then
        log_step "Cleaning up unused Docker objects..."
        docker system prune -f
        docker image prune -f
        log_success "Cleanup completed"
    fi
}

# Main build process
main() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║              AutoDev-AI Docker Build Script                  ║"
    echo "║                 Neural Bridge Platform                       ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    log_info "Build Configuration:"
    echo "  Build Type:    $BUILD_TYPE"
    echo "  Registry:      $REGISTRY"
    echo "  Image Name:    $IMAGE_NAME"
    echo "  Version:       $IMAGE_VERSION"
    echo "  Platform:      $PLATFORM"
    echo "  Push:          $PUSH"
    echo "  Cache:         $USE_CACHE"
    echo "  Health Check:  $HEALTH_CHECK"
    echo "  Parallel:      $PARALLEL_BUILD"
    echo "  Security Scan: $SECURITY_SCAN"
    echo ""
    
    validate_environment
    
    if [[ "$PARALLEL_BUILD" == "true" ]]; then
        # Build multiple types in parallel
        local build_types=("development" "production" "sandbox" "api" "gui")
        build_parallel "${build_types[@]}"
    else
        # Single build
        build_image "$BUILD_TYPE"
        push_images "$BUILD_TYPE"
        security_scan "$BUILD_TYPE"
    fi
    
    cleanup
    
    log_success "Docker build process completed successfully!"
    
    # Print summary
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                      BUILD SUMMARY                           ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo "  Build Date:    $BUILD_DATE"
    echo "  Git Commit:    $GIT_COMMIT"
    echo "  Image Version: $IMAGE_VERSION"
    echo "  Build Type:    $BUILD_TYPE"
    if [[ "$PUSH" == "true" ]]; then
        echo "  Registry:      $REGISTRY (pushed)"
    else
        echo "  Registry:      $REGISTRY (local only)"
    fi
}

# Error handling
trap 'log_error "Build failed! Check the output above for details."; exit 1' ERR

# Run main function
main "$@"