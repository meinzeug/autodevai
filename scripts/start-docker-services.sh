#!/bin/bash

# AutoDev-AI Docker Services Startup Script
# This script manages Docker services with PM2 for system boot persistence

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 AutoDev-AI Docker Services Manager${NC}"
echo "Project Directory: $PROJECT_DIR"
echo

# Function to check if Docker is running
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose is not installed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Docker is running${NC}"
}

# Function to create required directories and files
setup_environment() {
    echo -e "${YELLOW}📁 Setting up environment...${NC}"
    
    # Create logs directory
    mkdir -p "$PROJECT_DIR/logs"
    
    # Create data directories for volumes
    mkdir -p "$PROJECT_DIR/data/redis"
    mkdir -p "$PROJECT_DIR/data/postgres"
    mkdir -p "$PROJECT_DIR/data/prometheus"
    mkdir -p "$PROJECT_DIR/data/grafana"
    mkdir -p "$PROJECT_DIR/data/elasticsearch"
    
    # Set proper permissions
    chmod -R 755 "$PROJECT_DIR/logs"
    chmod -R 755 "$PROJECT_DIR/data"
    
    echo -e "${GREEN}✅ Environment setup complete${NC}"
}

# Function to start development stack
start_dev_stack() {
    echo -e "${YELLOW}🔧 Starting Development Stack...${NC}"
    pm2 start "$PROJECT_DIR/ecosystem.config.mjs" --only docker-dev-stack
    echo -e "${GREEN}✅ Development stack started${NC}"
    echo -e "   - Redis: localhost:6379"
    echo -e "   - PostgreSQL: localhost:5432"
    echo -e "   - Nginx: localhost:8080"
}

# Function to start monitoring stack
start_monitoring_stack() {
    echo -e "${YELLOW}📊 Starting Monitoring Stack...${NC}"
    pm2 start "$PROJECT_DIR/ecosystem.config.mjs" --only docker-monitoring
    echo -e "${GREEN}✅ Monitoring stack started${NC}"
    echo -e "   - Grafana: http://localhost:3000 (admin/autodev_monitoring_2024)"
    echo -e "   - Prometheus: http://localhost:9090"
    echo -e "   - Kibana: http://localhost:5601"
    echo -e "   - Elasticsearch: http://localhost:9200"
    echo -e "   - Jaeger: http://localhost:16686"
}

# Function to start production stack
start_prod_stack() {
    echo -e "${YELLOW}🏭 Starting Production Stack...${NC}"
    pm2 start "$PROJECT_DIR/ecosystem.config.mjs" --only docker-prod-stack
    echo -e "${GREEN}✅ Production stack started${NC}"
    echo -e "   - AutoDev-AI: localhost:50000-50003"
    echo -e "   - Redis: localhost:50051"
    echo -e "   - PostgreSQL: localhost:50050"
    echo -e "   - Grafana: http://localhost:50090"
    echo -e "   - Prometheus: http://localhost:50091"
    echo -e "   - Nginx: http://localhost:50080"
}

# Function to stop Docker services
stop_services() {
    echo -e "${YELLOW}🛑 Stopping Docker Services...${NC}"
    pm2 stop docker-dev-stack docker-monitoring docker-prod-stack 2>/dev/null || true
    echo -e "${GREEN}✅ All Docker services stopped${NC}"
}

# Function to restart Docker services
restart_services() {
    echo -e "${YELLOW}🔄 Restarting Docker Services...${NC}"
    pm2 restart docker-dev-stack docker-monitoring docker-prod-stack 2>/dev/null || true
    echo -e "${GREEN}✅ All Docker services restarted${NC}"
}

# Function to show status
show_status() {
    echo -e "${BLUE}📋 Docker Services Status:${NC}"
    pm2 status docker-dev-stack docker-monitoring docker-prod-stack 2>/dev/null || echo "No Docker services running"
    echo
    echo -e "${BLUE}🐳 Docker Containers:${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# Function to show logs
show_logs() {
    local service=${1:-"docker-dev-stack"}
    echo -e "${BLUE}📋 Showing logs for: $service${NC}"
    pm2 logs "$service" --lines 50
}

# Main menu
case "${1:-help}" in
    "dev")
        check_docker
        setup_environment
        start_dev_stack
        ;;
    "monitoring")
        check_docker
        setup_environment
        start_monitoring_stack
        ;;
    "prod")
        check_docker
        setup_environment
        start_prod_stack
        ;;
    "all")
        check_docker
        setup_environment
        start_dev_stack
        start_monitoring_stack
        echo -e "${GREEN}✅ All services started (dev + monitoring)${NC}"
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        restart_services
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs "${2:-docker-dev-stack}"
        ;;
    "help"|*)
        echo -e "${BLUE}Usage: $0 [command]${NC}"
        echo
        echo "Commands:"
        echo -e "  ${GREEN}dev${NC}        - Start development stack (Redis, PostgreSQL, Nginx)"
        echo -e "  ${GREEN}monitoring${NC} - Start monitoring stack (Grafana, Prometheus, etc.)"
        echo -e "  ${GREEN}prod${NC}       - Start production stack (Full AutoDev-AI platform)"
        echo -e "  ${GREEN}all${NC}        - Start development + monitoring stacks"
        echo -e "  ${GREEN}stop${NC}       - Stop all Docker services"
        echo -e "  ${GREEN}restart${NC}    - Restart all Docker services"
        echo -e "  ${GREEN}status${NC}     - Show service status"
        echo -e "  ${GREEN}logs${NC} [svc] - Show logs for service (default: docker-dev-stack)"
        echo -e "  ${GREEN}help${NC}       - Show this help message"
        echo
        echo "Examples:"
        echo -e "  ${YELLOW}$0 dev${NC}                    # Start development environment"
        echo -e "  ${YELLOW}$0 monitoring${NC}             # Start monitoring dashboard"
        echo -e "  ${YELLOW}$0 logs docker-monitoring${NC} # View monitoring logs"
        ;;
esac