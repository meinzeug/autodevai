#!/bin/bash

# AutoDev-AI Sandbox Management Script
# Manages creation, scaling, and lifecycle of project sandboxes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SANDBOX_TEMPLATE="$PROJECT_ROOT/docker/sandbox-template.yml"
PROJECTS_DIR="$PROJECT_ROOT/projects"
SANDBOX_CONFIG_DIR="$PROJECT_ROOT/.sandbox"

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

# Configuration
SANDBOX_BASE_PORT=50100
MAX_SANDBOXES=20
DEFAULT_ISOLATION="medium"
DEFAULT_RESOURCES="cpu=1,memory=2g"

# Initialize sandbox management
init_sandbox_manager() {
    echo_info "🏗️ Initializing Sandbox Manager..."
    
    # Create required directories
    mkdir -p "$SANDBOX_CONFIG_DIR"
    mkdir -p "$PROJECTS_DIR"
    mkdir -p "$PROJECT_ROOT/logs/sandboxes"
    
    # Create sandbox registry
    if [[ ! -f "$SANDBOX_CONFIG_DIR/registry.json" ]]; then
        echo '{"sandboxes": {}, "port_allocation": {}, "next_port": 50100}' > "$SANDBOX_CONFIG_DIR/registry.json"
    fi
    
    # Create network if it doesn't exist
    if ! docker network ls | grep -q "autodev_autodev-network"; then
        echo_info "🌐 Creating AutoDev network..."
        docker network create autodev_autodev-network --subnet=172.20.0.0/16 || true
    fi
    
    echo_success "Sandbox Manager initialized"
}

# Get next available port
get_next_port() {
    local registry="$SANDBOX_CONFIG_DIR/registry.json"
    local next_port=$(jq -r '.next_port' "$registry")
    
    # Check if port is actually available
    while netstat -tuln 2>/dev/null | grep -q ":$next_port "; do
        ((next_port++))
    done
    
    # Update registry
    jq ".next_port = $((next_port + 10))" "$registry" > "$registry.tmp" && mv "$registry.tmp" "$registry"
    
    echo "$next_port"
}

# Register sandbox
register_sandbox() {
    local sandbox_id="$1"
    local port="$2"
    local project_path="$3"
    local sandbox_type="$4"
    
    local registry="$SANDBOX_CONFIG_DIR/registry.json"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    jq --arg id "$sandbox_id" \
       --arg port "$port" \
       --arg path "$project_path" \
       --arg type "$sandbox_type" \
       --arg created "$timestamp" \
       '.sandboxes[$id] = {
           port: ($port | tonumber),
           project_path: $path,
           sandbox_type: $type,
           created: $created,
           status: "creating"
       } | .port_allocation[$port] = $id' \
       "$registry" > "$registry.tmp" && mv "$registry.tmp" "$registry"
}

# Update sandbox status
update_sandbox_status() {
    local sandbox_id="$1"
    local status="$2"
    
    local registry="$SANDBOX_CONFIG_DIR/registry.json"
    
    jq --arg id "$sandbox_id" \
       --arg status "$status" \
       '.sandboxes[$id].status = $status' \
       "$registry" > "$registry.tmp" && mv "$registry.tmp" "$registry"
}

# Create new sandbox
create_sandbox() {
    local sandbox_id="$1"
    local project_name="${2:-$sandbox_id}"
    local sandbox_type="${3:-nodejs}"
    local isolation_level="${4:-$DEFAULT_ISOLATION}"
    
    echo_info "🏗️ Creating sandbox: $sandbox_id (type: $sandbox_type)"
    
    # Validate inputs
    if [[ -z "$sandbox_id" ]]; then
        echo_error "Sandbox ID is required"
        return 1
    fi
    
    if [[ ! "$sandbox_type" =~ ^(nodejs|python|react|api)$ ]]; then
        echo_error "Invalid sandbox type: $sandbox_type"
        echo_info "Valid types: nodejs, python, react, api"
        return 1
    fi
    
    # Check if sandbox already exists
    local registry="$SANDBOX_CONFIG_DIR/registry.json"
    if jq -e ".sandboxes[\"$sandbox_id\"]" "$registry" > /dev/null 2>&1; then
        echo_error "Sandbox $sandbox_id already exists"
        return 1
    fi
    
    # Check sandbox limit
    local sandbox_count=$(jq '.sandboxes | length' "$registry")
    if [[ $sandbox_count -ge $MAX_SANDBOXES ]]; then
        echo_error "Maximum sandbox limit reached ($MAX_SANDBOXES)"
        return 1
    fi
    
    # Get available port
    local port=$(get_next_port)
    
    # Create project directory
    local project_path="$PROJECTS_DIR/$project_name"
    mkdir -p "$project_path"
    
    # Register sandbox
    register_sandbox "$sandbox_id" "$port" "$project_path" "$sandbox_type"
    
    # Create sandbox-specific environment file
    local env_file="$SANDBOX_CONFIG_DIR/${sandbox_id}.env"
    cat > "$env_file" << EOF
SANDBOX_ID=$sandbox_id
SANDBOX_TYPE=$sandbox_type
SANDBOX_PORT=$port
SANDBOX_DEBUG_PORT=$((port + 1))
SANDBOX_PYTHON_PORT=$((port + 2))
SANDBOX_JUPYTER_PORT=$((port + 3))
SANDBOX_DB_PORT=$((port + 4))
SANDBOX_REDIS_PORT=$((port + 5))
SANDBOX_CODE_PORT=$((port + 6))
PROJECT_PATH=$project_path
ISOLATION_LEVEL=$isolation_level
SANDBOX_DB=${sandbox_id}_db
SANDBOX_DB_USER=${sandbox_id}_user
SANDBOX_DB_PASS=${sandbox_id}_pass_2024
SANDBOX_REDIS_PASS=${sandbox_id}_redis_2024
SANDBOX_CODE_PASS=${sandbox_id}_code_2024
EOF
    
    # Start sandbox containers
    echo_info "🚀 Starting sandbox containers..."
    
    cd "$PROJECT_ROOT"
    COMPOSE_PROJECT_NAME="sandbox-${sandbox_id}" \
    docker-compose -f "$SANDBOX_TEMPLATE" --env-file "$env_file" up -d
    
    # Wait for services to be ready
    echo_info "⏳ Waiting for sandbox services to start..."
    sleep 10
    
    # Check if main sandbox container is running
    if docker ps | grep -q "sandbox-${sandbox_id}-nodejs\|sandbox-${sandbox_id}-python"; then
        update_sandbox_status "$sandbox_id" "running"
        echo_success "Sandbox $sandbox_id created successfully!"
        echo_info "📱 Access URLs:"
        echo "  Code Server: http://localhost:$((port + 6))"
        case $sandbox_type in
            nodejs)
                echo "  App: http://localhost:$port"
                echo "  Debug: http://localhost:$((port + 1))"
                ;;
            python)
                echo "  App: http://localhost:$((port + 2))"
                echo "  Jupyter: http://localhost:$((port + 3))"
                ;;
        esac
        echo "  Database: localhost:$((port + 4))"
        echo "  Redis: localhost:$((port + 5))"
    else
        update_sandbox_status "$sandbox_id" "failed"
        echo_error "Failed to start sandbox $sandbox_id"
        return 1
    fi
}

# List sandboxes
list_sandboxes() {
    local registry="$SANDBOX_CONFIG_DIR/registry.json"
    
    if [[ ! -f "$registry" ]]; then
        echo_warning "No sandboxes found"
        return 0
    fi
    
    echo_info "📋 Active Sandboxes"
    echo "==================="
    
    jq -r '.sandboxes | to_entries[] | "\(.key)\t\(.value.sandbox_type)\t\(.value.port)\t\(.value.status)"' "$registry" | \
    while IFS=$'\t' read -r id type port status; do
        case $status in
            running) status_icon="🟢" ;;
            stopped) status_icon="🔴" ;;
            creating) status_icon="🟡" ;;
            failed) status_icon="💥" ;;
            *) status_icon="❓" ;;
        esac
        printf "%-15s %-10s %-8s %s %s\n" "$id" "$type" "$port" "$status_icon" "$status"
    done
}

# Stop sandbox
stop_sandbox() {
    local sandbox_id="$1"
    
    if [[ -z "$sandbox_id" ]]; then
        echo_error "Sandbox ID is required"
        return 1
    fi
    
    echo_info "🛑 Stopping sandbox: $sandbox_id"
    
    # Check if sandbox exists
    local registry="$SANDBOX_CONFIG_DIR/registry.json"
    if ! jq -e ".sandboxes[\"$sandbox_id\"]" "$registry" > /dev/null 2>&1; then
        echo_error "Sandbox $sandbox_id not found"
        return 1
    fi
    
    # Stop containers
    cd "$PROJECT_ROOT"
    local env_file="$SANDBOX_CONFIG_DIR/${sandbox_id}.env"
    if [[ -f "$env_file" ]]; then
        COMPOSE_PROJECT_NAME="sandbox-${sandbox_id}" \
        docker-compose -f "$SANDBOX_TEMPLATE" --env-file "$env_file" down
    else
        # Fallback: stop containers by naming pattern
        docker stop $(docker ps -q --filter "name=sandbox-${sandbox_id}") 2>/dev/null || true
        docker rm $(docker ps -aq --filter "name=sandbox-${sandbox_id}") 2>/dev/null || true
    fi
    
    update_sandbox_status "$sandbox_id" "stopped"
    echo_success "Sandbox $sandbox_id stopped"
}

# Start stopped sandbox
start_sandbox() {
    local sandbox_id="$1"
    
    if [[ -z "$sandbox_id" ]]; then
        echo_error "Sandbox ID is required"
        return 1
    fi
    
    echo_info "▶️ Starting sandbox: $sandbox_id"
    
    # Check if sandbox exists
    local registry="$SANDBOX_CONFIG_DIR/registry.json"
    if ! jq -e ".sandboxes[\"$sandbox_id\"]" "$registry" > /dev/null 2>&1; then
        echo_error "Sandbox $sandbox_id not found"
        return 1
    fi
    
    # Start containers
    cd "$PROJECT_ROOT"
    local env_file="$SANDBOX_CONFIG_DIR/${sandbox_id}.env"
    if [[ -f "$env_file" ]]; then
        COMPOSE_PROJECT_NAME="sandbox-${sandbox_id}" \
        docker-compose -f "$SANDBOX_TEMPLATE" --env-file "$env_file" up -d
        
        update_sandbox_status "$sandbox_id" "running"
        echo_success "Sandbox $sandbox_id started"
    else
        echo_error "Environment file not found for sandbox $sandbox_id"
        return 1
    fi
}

# Remove sandbox
remove_sandbox() {
    local sandbox_id="$1"
    local force="${2:-false}"
    
    if [[ -z "$sandbox_id" ]]; then
        echo_error "Sandbox ID is required"
        return 1
    fi
    
    echo_warning "🗑️ Removing sandbox: $sandbox_id"
    
    # Check if sandbox exists
    local registry="$SANDBOX_CONFIG_DIR/registry.json"
    if ! jq -e ".sandboxes[\"$sandbox_id\"]" "$registry" > /dev/null 2>&1; then
        echo_error "Sandbox $sandbox_id not found"
        return 1
    fi
    
    # Confirm removal
    if [[ "$force" != "true" ]]; then
        read -p "Are you sure you want to remove sandbox $sandbox_id? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo_info "Removal cancelled"
            return 0
        fi
    fi
    
    # Stop and remove containers
    stop_sandbox "$sandbox_id"
    
    # Remove volumes
    cd "$PROJECT_ROOT"
    local env_file="$SANDBOX_CONFIG_DIR/${sandbox_id}.env"
    if [[ -f "$env_file" ]]; then
        COMPOSE_PROJECT_NAME="sandbox-${sandbox_id}" \
        docker-compose -f "$SANDBOX_TEMPLATE" --env-file "$env_file" down -v
    fi
    
    # Get port to free up
    local port=$(jq -r ".sandboxes[\"$sandbox_id\"].port" "$registry")
    
    # Remove from registry
    jq --arg id "$sandbox_id" \
       --arg port "$port" \
       'del(.sandboxes[$id]) | del(.port_allocation[$port])' \
       "$registry" > "$registry.tmp" && mv "$registry.tmp" "$registry"
    
    # Remove environment file
    rm -f "$env_file"
    
    echo_success "Sandbox $sandbox_id removed"
}

# Scale sandboxes (create multiple)
scale_sandboxes() {
    local count="$1"
    local prefix="${2:-sandbox}"
    local sandbox_type="${3:-nodejs}"
    
    if [[ ! "$count" =~ ^[0-9]+$ ]] || [[ $count -lt 1 ]]; then
        echo_error "Invalid count: $count"
        return 1
    fi
    
    echo_info "📈 Creating $count sandboxes with prefix '$prefix'"
    
    for ((i=1; i<=count; i++)); do
        local sandbox_id="${prefix}-$(printf "%03d" $i)"
        local project_name="${prefix}-project-$(printf "%03d" $i)"
        
        echo_info "Creating sandbox $i/$count: $sandbox_id"
        
        if ! create_sandbox "$sandbox_id" "$project_name" "$sandbox_type"; then
            echo_error "Failed to create sandbox $sandbox_id"
            return 1
        fi
        
        # Brief pause to avoid overwhelming the system
        sleep 2
    done
    
    echo_success "Created $count sandboxes successfully"
}

# Get sandbox info
get_sandbox_info() {
    local sandbox_id="$1"
    
    if [[ -z "$sandbox_id" ]]; then
        echo_error "Sandbox ID is required"
        return 1
    fi
    
    local registry="$SANDBOX_CONFIG_DIR/registry.json"
    if ! jq -e ".sandboxes[\"$sandbox_id\"]" "$registry" > /dev/null 2>&1; then
        echo_error "Sandbox $sandbox_id not found"
        return 1
    fi
    
    echo_info "📋 Sandbox Information: $sandbox_id"
    echo "======================================"
    
    jq -r ".sandboxes[\"$sandbox_id\"] | 
        \"Type: \\(.sandbox_type)\\n\" +
        \"Port: \\(.port)\\n\" +
        \"Status: \\(.status)\\n\" +
        \"Project Path: \\(.project_path)\\n\" +
        \"Created: \\(.created)\"" "$registry"
    
    # Show container status
    echo -e "\n🐳 Container Status:"
    docker ps --filter "name=sandbox-${sandbox_id}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    # Show resource usage
    echo -e "\n💾 Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" \
        $(docker ps -q --filter "name=sandbox-${sandbox_id}") 2>/dev/null || echo "No running containers"
}

# Cleanup stopped sandboxes
cleanup_sandboxes() {
    echo_info "🧹 Cleaning up stopped sandboxes..."
    
    local registry="$SANDBOX_CONFIG_DIR/registry.json"
    local cleanup_count=0
    
    # Find sandboxes marked as stopped
    local stopped_sandboxes=$(jq -r '.sandboxes | to_entries[] | select(.value.status == "stopped") | .key' "$registry")
    
    for sandbox_id in $stopped_sandboxes; do
        echo_info "🗑️ Cleaning up stopped sandbox: $sandbox_id"
        
        # Remove containers and volumes
        cd "$PROJECT_ROOT"
        local env_file="$SANDBOX_CONFIG_DIR/${sandbox_id}.env"
        if [[ -f "$env_file" ]]; then
            COMPOSE_PROJECT_NAME="sandbox-${sandbox_id}" \
            docker-compose -f "$SANDBOX_TEMPLATE" --env-file "$env_file" down -v 2>/dev/null || true
        fi
        
        # Remove orphaned containers
        docker rm $(docker ps -aq --filter "name=sandbox-${sandbox_id}") 2>/dev/null || true
        
        ((cleanup_count++))
    done
    
    # Clean up orphaned volumes
    echo_info "🧽 Removing orphaned volumes..."
    docker volume prune -f
    
    # Clean up orphaned networks
    docker network prune -f
    
    echo_success "Cleanup completed. Removed $cleanup_count sandboxes."
}

# Show sandbox logs
show_logs() {
    local sandbox_id="$1"
    local service="${2:-}"
    
    if [[ -z "$sandbox_id" ]]; then
        echo_error "Sandbox ID is required"
        return 1
    fi
    
    echo_info "📋 Showing logs for sandbox: $sandbox_id"
    
    cd "$PROJECT_ROOT"
    local env_file="$SANDBOX_CONFIG_DIR/${sandbox_id}.env"
    
    if [[ -f "$env_file" ]]; then
        if [[ -n "$service" ]]; then
            COMPOSE_PROJECT_NAME="sandbox-${sandbox_id}" \
            docker-compose -f "$SANDBOX_TEMPLATE" --env-file "$env_file" logs -f "$service"
        else
            COMPOSE_PROJECT_NAME="sandbox-${sandbox_id}" \
            docker-compose -f "$SANDBOX_TEMPLATE" --env-file "$env_file" logs -f
        fi
    else
        echo_error "Environment file not found for sandbox $sandbox_id"
        return 1
    fi
}

# Usage information
usage() {
    cat << EOF
Usage: $0 <command> [arguments]

AutoDev-AI Sandbox Management

COMMANDS:
    init                          Initialize sandbox manager
    create <id> [project] [type]  Create new sandbox
    list                          List all sandboxes
    start <id>                    Start stopped sandbox
    stop <id>                     Stop running sandbox
    remove <id> [--force]         Remove sandbox
    info <id>                     Show sandbox information
    scale <count> [prefix] [type] Create multiple sandboxes
    cleanup                       Clean up stopped sandboxes
    logs <id> [service]           Show sandbox logs

EXAMPLES:
    $0 init                                    # Initialize sandbox manager
    $0 create web-app myproject nodejs         # Create Node.js sandbox
    $0 create ml-app dataproject python        # Create Python sandbox
    $0 scale 5 test nodejs                     # Create 5 Node.js test sandboxes
    $0 list                                    # List all sandboxes
    $0 stop web-app                            # Stop web-app sandbox
    $0 remove web-app --force                  # Force remove web-app sandbox
    $0 cleanup                                 # Clean up all stopped sandboxes

SANDBOX TYPES:
    nodejs    - Node.js development environment
    python    - Python development environment
    react     - React development environment
    api       - API development environment

PORTS:
    Base ports start at 50100 and increment by 10 for each sandbox
    Each sandbox uses multiple ports for different services:
    - Main app, debug, database, Redis, code server, etc.
EOF
}

# Main command dispatcher
main() {
    local command="${1:-}"
    
    case $command in
        init)
            init_sandbox_manager
            ;;
        create)
            if [[ $# -lt 2 ]]; then
                echo_error "Sandbox ID is required"
                usage
                exit 1
            fi
            create_sandbox "$2" "$3" "$4" "$5"
            ;;
        list)
            list_sandboxes
            ;;
        start)
            if [[ $# -lt 2 ]]; then
                echo_error "Sandbox ID is required"
                usage
                exit 1
            fi
            start_sandbox "$2"
            ;;
        stop)
            if [[ $# -lt 2 ]]; then
                echo_error "Sandbox ID is required"
                usage
                exit 1
            fi
            stop_sandbox "$2"
            ;;
        remove)
            if [[ $# -lt 2 ]]; then
                echo_error "Sandbox ID is required"
                usage
                exit 1
            fi
            local force="false"
            [[ "$3" == "--force" ]] && force="true"
            remove_sandbox "$2" "$force"
            ;;
        info)
            if [[ $# -lt 2 ]]; then
                echo_error "Sandbox ID is required"
                usage
                exit 1
            fi
            get_sandbox_info "$2"
            ;;
        scale)
            if [[ $# -lt 2 ]]; then
                echo_error "Count is required"
                usage
                exit 1
            fi
            scale_sandboxes "$2" "$3" "$4"
            ;;
        cleanup)
            cleanup_sandboxes
            ;;
        logs)
            if [[ $# -lt 2 ]]; then
                echo_error "Sandbox ID is required"
                usage
                exit 1
            fi
            show_logs "$2" "$3"
            ;;
        -h|--help|help|"")
            usage
            ;;
        *)
            echo_error "Unknown command: $command"
            usage
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"