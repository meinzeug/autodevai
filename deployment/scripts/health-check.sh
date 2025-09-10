#!/bin/bash
set -e

# AutoDev-AI Neural Bridge Platform - Health Check Script
# This script performs comprehensive health checks on all services

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

# Health check results
HEALTH_STATUS=0
SERVICES_CHECKED=0
SERVICES_HEALTHY=0

# Check service health
check_service() {
  local service_name=$1
  local check_command=$2
  local description=$3
  
  SERVICES_CHECKED=$((SERVICES_CHECKED + 1))
  
  log_info "Checking $service_name: $description"
  
  if eval "$check_command" >/dev/null 2>&1; then
    log_success "$service_name is healthy"
    SERVICES_HEALTHY=$((SERVICES_HEALTHY + 1))
    return 0
  else
    log_error "$service_name is unhealthy"
    HEALTH_STATUS=1
    return 1
  fi
}

# Check HTTP endpoint
check_http() {
  local url=$1
  local expected_status=${2:-200}
  local timeout=${3:-10}
  
  local status_code
  status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" "$url")
  
  if [ "$status_code" = "$expected_status" ]; then
    return 0
  else
    return 1
  fi
}

# Check TCP port
check_tcp() {
  local host=$1
  local port=$2
  local timeout=${3:-5}
  
  if timeout "$timeout" bash -c "</dev/tcp/$host/$port"; then
    return 0
  else
    return 1
  fi
}

# Check Docker container
check_container() {
  local container_name=$1
  
  if docker ps --format "{{.Names}}" | grep -q "^$container_name$"; then
    local health_status
    health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "no-healthcheck")
    
    if [ "$health_status" = "healthy" ] || [ "$health_status" = "no-healthcheck" ]; then
      return 0
    else
      return 1
    fi
  else
    return 1
  fi
}

# Main health checks
main_health_checks() {
  log_info "🔍 AutoDev-AI Neural Bridge Platform Health Check"
  log_info "Timestamp: $(date)"
  echo ""
  
  # Docker daemon check
  check_service "Docker Daemon" "docker info" "Docker daemon status"
  
  # Core application services
  check_service "AutoDev-AI App" "check_container autodev-ai-app" "Main application container"
  check_service "AutoDev-AI HTTP" "check_http http://localhost:50000/health" "Application HTTP endpoint"
  
  # Database services
  check_service "PostgreSQL Container" "check_container autodev-ai-db" "Database container"
  check_service "PostgreSQL Connection" "check_tcp localhost 50001" "Database connection"
  
  # Cache services
  check_service "Redis Container" "check_container autodev-ai-redis" "Redis cache container"
  check_service "Redis Connection" "check_tcp localhost 50002" "Redis connection"
  
  # Load balancer
  check_service "Nginx Container" "check_container autodev-ai-nginx" "Nginx load balancer"
  check_service "Nginx HTTP" "check_http http://localhost:50003/health" "Load balancer HTTP"
  check_service "Nginx HTTPS" "check_http https://localhost:50004/health" "Load balancer HTTPS"
  
  # Monitoring services
  check_service "Prometheus Container" "check_container autodev-ai-prometheus" "Prometheus monitoring"
  check_service "Prometheus HTTP" "check_http http://localhost:50005/-/healthy" "Prometheus endpoint"
  
  check_service "Grafana Container" "check_container autodev-ai-grafana" "Grafana dashboard"
  check_service "Grafana HTTP" "check_http http://localhost:50006/api/health" "Grafana endpoint"
  
  # ELK Stack
  check_service "Elasticsearch Container" "check_container autodev-ai-elasticsearch" "Elasticsearch service"
  check_service "Elasticsearch HTTP" "check_http http://localhost:50007/_cluster/health" "Elasticsearch cluster"
  
  check_service "Kibana Container" "check_container autodev-ai-kibana" "Kibana service"
  check_service "Kibana HTTP" "check_http http://localhost:50009/api/status" "Kibana endpoint"
  
  # Sandbox manager
  check_service "Sandbox Manager" "check_container autodev-ai-sandbox-manager" "Sandbox manager"
  check_service "Sandbox HTTP" "check_tcp localhost 50010 1" "Sandbox port range start"
  
  # System resources
  check_service "Disk Space" "[ \$(df / | awk 'NR==2 {print \$5}' | sed 's/%//') -lt 90 ]" "Root filesystem usage < 90%"
  check_service "Memory Usage" "[ \$(free | awk 'NR==2{printf \"%.0f\", \$3/\$2*100}') -lt 90 ]" "Memory usage < 90%"
  check_service "Load Average" "[ \$(uptime | awk -F'load average:' '{print \$2}' | awk '{print \$1}' | sed 's/,//') -lt 5 ]" "Load average < 5.0"
}

# Extended health checks
extended_health_checks() {
  log_info ""
  log_info "🔬 Extended Health Checks"
  
  # API endpoints
  if check_http "http://localhost:50000/api/health" 200 5; then
    log_success "API health endpoint responsive"
  else
    log_warning "API health endpoint not responding"
  fi
  
  # WebSocket connection
  if command -v wscat &> /dev/null; then
    if timeout 5 wscat -c ws://localhost:50000/ws -x 'ping' | grep -q 'pong'; then
      log_success "WebSocket connection working"
    else
      log_warning "WebSocket connection failed"
    fi
  fi
  
  # Database query test
  if docker exec autodev-ai-db psql -U autodev -d autodev_ai -c "SELECT 1;" >/dev/null 2>&1; then
    log_success "Database query test passed"
  else
    log_error "Database query test failed"
    HEALTH_STATUS=1
  fi
  
  # Redis ping test
  if docker exec autodev-ai-redis redis-cli ping | grep -q PONG; then
    log_success "Redis ping test passed"
  else
    log_error "Redis ping test failed"
    HEALTH_STATUS=1
  fi
  
  # Neural bridge test
  if check_http "http://localhost:50000/neural/status" 200 10; then
    log_success "Neural bridge endpoint responsive"
  else
    log_warning "Neural bridge endpoint not responding"
  fi
  
  # Sandbox creation test
  if check_http "http://localhost:50010/health" 200 5; then
    log_success "Sandbox manager responsive"
  else
    log_warning "Sandbox manager not responding"
  fi
}

# Performance metrics
performance_metrics() {
  log_info ""
  log_info "📊 Performance Metrics"
  
  # System metrics
  echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//' || echo "N/A")"
  echo "Memory Usage: $(free -h | awk 'NR==2{printf "%.1f%% (%s/%s)", $3/$2*100, $3, $2}' || echo "N/A")"
  echo "Disk Usage: $(df -h / | awk 'NR==2{printf "%s (%s)", $5, $4}' || echo "N/A")"
  echo "Load Average: $(uptime | awk -F'load average:' '{print $2}' || echo "N/A")"
  
  # Docker metrics
  echo "Running Containers: $(docker ps -q | wc -l)"
  echo "Docker Images: $(docker images -q | wc -l)"
  echo "Docker Volumes: $(docker volume ls -q | wc -l)"
  
  # Network metrics
  if command -v netstat &> /dev/null; then
    echo "Network Connections: $(netstat -an | grep ESTABLISHED | wc -l)"
    echo "Listening Ports: $(netstat -tln | grep LISTEN | wc -l)"
  fi
}

# Generate health report
generate_report() {
  log_info ""
  log_info "📋 Health Check Report"
  echo "======================================"
  echo "Timestamp: $(date)"
  echo "Services Checked: $SERVICES_CHECKED"
  echo "Services Healthy: $SERVICES_HEALTHY"
  echo "Services Unhealthy: $((SERVICES_CHECKED - SERVICES_HEALTHY))"
  echo "Overall Status: $([ $HEALTH_STATUS -eq 0 ] && echo "HEALTHY" || echo "UNHEALTHY")"
  echo "Success Rate: $(( (SERVICES_HEALTHY * 100) / SERVICES_CHECKED ))%"
  echo "======================================"
}

# Alert if unhealthy
send_alerts() {
  if [ $HEALTH_STATUS -ne 0 ]; then
    local message="AutoDev-AI Health Check FAILED: $((SERVICES_CHECKED - SERVICES_HEALTHY))/$SERVICES_CHECKED services unhealthy"
    
    # Email alert
    if [ -n "$NOTIFICATION_EMAIL" ] && command -v mail &> /dev/null; then
      echo "$message" | mail -s "AutoDev-AI Health Alert" "$NOTIFICATION_EMAIL"
    fi
    
    # Slack alert
    if [ -n "$SLACK_WEBHOOK" ]; then
      curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🚨 $message\"}" \
        "$SLACK_WEBHOOK" >/dev/null 2>&1
    fi
    
    # Discord alert
    if [ -n "$DISCORD_WEBHOOK" ]; then
      curl -H "Content-Type: application/json" \
        -d "{\"content\":\"🚨 $message\"}" \
        "$DISCORD_WEBHOOK" >/dev/null 2>&1
    fi
  fi
}

# Usage information
usage() {
  echo "AutoDev-AI Health Check Script"
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  --help          Show this help message"
  echo "  --extended      Run extended health checks"
  echo "  --json          Output results in JSON format"
  echo "  --silent        Only output errors"
  echo "  --alert         Send alerts if unhealthy"
  echo ""
}

# JSON output
json_output() {
  cat << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "services_checked": $SERVICES_CHECKED,
  "services_healthy": $SERVICES_HEALTHY,
  "services_unhealthy": $((SERVICES_CHECKED - SERVICES_HEALTHY)),
  "overall_status": "$([ $HEALTH_STATUS -eq 0 ] && echo "HEALTHY" || echo "UNHEALTHY")",
  "success_rate": $(( (SERVICES_HEALTHY * 100) / SERVICES_CHECKED )),
  "health_status_code": $HEALTH_STATUS
}
EOF
}

# Main function
main() {
  local extended=false
  local json_format=false
  local silent=false
  local send_alert=false
  
  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      --extended)
        extended=true
        shift
        ;;
      --json)
        json_format=true
        silent=true
        shift
        ;;
      --silent)
        silent=true
        shift
        ;;
      --alert)
        send_alert=true
        shift
        ;;
      --help)
        usage
        exit 0
        ;;
      *)
        log_error "Unknown option: $1"
        usage
        exit 1
        ;;
    esac
  done
  
  # Redirect output if silent
  if [ "$silent" = true ] && [ "$json_format" = false ]; then
    exec 1>/dev/null
  fi
  
  # Load environment if available
  if [ -f ".env.production" ]; then
    export $(grep -v '^#' .env.production | xargs) 2>/dev/null || true
  fi
  
  # Run health checks
  main_health_checks
  
  if [ "$extended" = true ]; then
    extended_health_checks
    performance_metrics
  fi
  
  # Output results
  if [ "$json_format" = true ]; then
    json_output
  else
    generate_report
  fi
  
  # Send alerts if requested
  if [ "$send_alert" = true ]; then
    send_alerts
  fi
  
  exit $HEALTH_STATUS
}

# Run main function with all arguments
main "$@"