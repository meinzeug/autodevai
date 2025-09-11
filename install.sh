#!/bin/bash

# AutoDev-AI Installation Script for Ubuntu 24.04
# This script sets up the complete Docker infrastructure and deployment environment

set -e

# Color output functions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

echo_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo_error "This script should not be run as root. Please run as a regular user with sudo privileges."
   exit 1
fi

# Check Ubuntu version
if ! lsb_release -d | grep -q "Ubuntu 24.04"; then
    echo_warning "This script is designed for Ubuntu 24.04. Your version:"
    lsb_release -d
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo_info "🚀 Starting AutoDev-AI Installation on Ubuntu 24.04"
echo_info "📦 This will install Docker, Docker Compose, and set up the complete infrastructure"

# Update system packages
echo_info "📱 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install required system packages
echo_info "📦 Installing system dependencies..."
sudo apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    software-properties-common \
    git \
    wget \
    unzip \
    jq \
    htop \
    tree \
    vim \
    net-tools \
    telnet \
    netcat \
    iputils-ping \
    dnsutils \
    build-essential \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm

# Install Docker
echo_info "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker Engine
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    
    echo_success "Docker installed successfully"
else
    echo_success "Docker is already installed"
fi

# Install Docker Compose (standalone)
echo_info "📦 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo_success "Docker Compose installed successfully"
else
    echo_success "Docker Compose is already installed"
fi

# Install Node.js (latest LTS)
echo_info "🟢 Installing Node.js LTS..."
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | sed 's/v//') -lt 18 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo_success "Node.js $(node -v) installed successfully"
else
    echo_success "Node.js $(node -v) is already installed"
fi

# Install global Node.js packages
echo_info "📦 Installing global Node.js packages..."
sudo npm install -g \
    @claudejs/claude-code \
    claude-flow@alpha \
    pm2 \
    nodemon \
    create-react-app \
    typescript \
    eslint \
    prettier

# Setup firewall rules for AutoDev ports
echo_info "🔥 Configuring firewall for AutoDev ports (50000-50199)..."
sudo ufw --force enable
sudo ufw allow 22/tcp
sudo ufw allow 50000:50199/tcp
sudo ufw allow 50000:50199/udp
echo_success "Firewall configured for AutoDev ports"

# Create AutoDev directories
echo_info "📁 Creating AutoDev directory structure..."
mkdir -p ~/autodev-ai/{projects,logs,backups,ssl}
mkdir -p ~/autodev-ai/docker/{configs,monitoring,nginx}
mkdir -p ~/autodev-ai/.swarm

# Set up SSL certificates (self-signed for development)
echo_info "🔐 Generating SSL certificates for development..."
cd ~/autodev-ai/ssl
if [ ! -f server.crt ]; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout server.key \
        -out server.crt \
        -subj "/C=US/ST=Development/L=AutoDev/O=AutoDev-AI/CN=localhost"
    echo_success "SSL certificates generated"
fi

# Copy SSL certificates to docker directory
cp ~/autodev-ai/ssl/* ~/autodev-ai/docker/nginx/

# Create Nginx configuration
echo_info "🌐 Creating Nginx configuration..."
cat > ~/autodev-ai/docker/nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream autodev_api {
        server 172.20.0.30:50052;
    }
    
    upstream autodev_gui {
        server autodev-gui:3000;
    }
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=gui:10m rate=30r/s;
    
    server {
        listen 80;
        server_name localhost;
        
        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }
    
    server {
        listen 443 ssl http2;
        server_name localhost;
        
        ssl_certificate /etc/nginx/ssl/server.crt;
        ssl_certificate_key /etc/nginx/ssl/server.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
        
        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://autodev_api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # GUI routes
        location / {
            limit_req zone=gui burst=50 nodelay;
            proxy_pass http://autodev_gui/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
        
        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Create Prometheus configuration
echo_info "📊 Creating monitoring configuration..."
cat > ~/autodev-ai/docker/monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'autodev-api'
    static_configs:
      - targets: ['172.20.0.30:50052']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'docker'
    static_configs:
      - targets: ['docker-proxy:9323']
EOF

# Create Grafana datasources configuration
cat > ~/autodev-ai/docker/monitoring/datasources.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://172.20.0.21:9090
    isDefault: true
    editable: true
EOF

# Create environment file
echo_info "🔧 Creating environment configuration..."
cat > ~/autodev-ai/.env << 'EOF'
# AutoDev-AI Environment Configuration
COMPOSE_PROJECT_NAME=autodev
COMPOSE_FILE=docker/docker-compose.yml

# Database Configuration
POSTGRES_DB=autodev
POSTGRES_USER=autodev
POSTGRES_PASSWORD=dev_secure_2024
DATABASE_URL=postgres://autodev:dev_secure_2024@localhost:50050/autodev

# Redis Configuration
REDIS_PASSWORD=redis_secure_2024
REDIS_URL=redis://:redis_secure_2024@localhost:50051

# API Configuration
API_PORT=50052
JWT_SECRET=jwt_super_secure_key_2024
NODE_ENV=development

# Grafana Configuration
GF_SECURITY_ADMIN_PASSWORD=admin_secure_2024

# Sandbox Configuration
SANDBOX_BASE_PORT=50100
SANDBOX_COUNT_LIMIT=20
ISOLATION_LEVEL=medium

# SSL Configuration
SSL_CERT_PATH=./ssl/server.crt
SSL_KEY_PATH=./ssl/server.key

# Development
DISPLAY=${DISPLAY:-:0}
EOF

# Setup systemd service for AutoDev
echo_info "🔧 Creating AutoDev systemd service..."
sudo tee /etc/systemd/system/autodev.service > /dev/null << 'EOF'
[Unit]
Description=AutoDev-AI Docker Infrastructure
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/$USER/autodev-ai
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0
User=$USER
Group=docker

[Install]
WantedBy=multi-user.target
EOF

# Replace $USER with actual username in service file
sudo sed -i "s/\$USER/$USER/g" /etc/systemd/system/autodev.service

# Enable and configure the service
sudo systemctl daemon-reload
sudo systemctl enable autodev.service

# Create management scripts
echo_info "📝 Creating management scripts..."

# Main start script
cat > ~/autodev-ai/start.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting AutoDev-AI Infrastructure..."

# Load environment
source .env

# Start core services
docker-compose up -d postgres redis prometheus grafana

# Wait for database to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
while ! docker exec autodev-postgres pg_isready -U autodev -d autodev; do
    sleep 2
done

# Start API and GUI
docker-compose up -d autodev-api autodev-gui nginx-lb

echo "✅ AutoDev-AI Infrastructure started successfully!"
echo "🌐 Web Interface: https://localhost:50061"
echo "📊 Grafana: http://localhost:50090 (admin/admin_secure_2024)"
echo "🔍 Prometheus: http://localhost:50091"
echo "💾 PostgreSQL: localhost:50050"
echo "🚀 Redis: localhost:50051"
EOF

# Stop script
cat > ~/autodev-ai/stop.sh << 'EOF'
#!/bin/bash
set -e

echo "🛑 Stopping AutoDev-AI Infrastructure..."

# Stop all services gracefully
docker-compose down

echo "✅ AutoDev-AI stopped successfully!"
EOF

# Status script
cat > ~/autodev-ai/status.sh << 'EOF'
#!/bin/bash

echo "📊 AutoDev-AI Infrastructure Status"
echo "=================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running"
    exit 1
fi

# Show running containers
echo "🐳 Running Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep autodev || echo "No AutoDev containers running"

echo -e "\n🌐 Service URLs:"
echo "  Web Interface: https://localhost:50061"
echo "  Grafana: http://localhost:50090"
echo "  Prometheus: http://localhost:50091"
echo "  PostgreSQL: localhost:50050"
echo "  Redis: localhost:50051"

echo -e "\n💾 Resource Usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep autodev || echo "No AutoDev containers running"
EOF

# Logs script
cat > ~/autodev-ai/logs.sh << 'EOF'
#!/bin/bash

SERVICE=${1:-""}

if [ -z "$SERVICE" ]; then
    echo "📋 Available services:"
    docker-compose config --services
    echo ""
    echo "Usage: ./logs.sh <service-name>"
    echo "       ./logs.sh all  # for all services"
    exit 1
fi

if [ "$SERVICE" = "all" ]; then
    docker-compose logs -f
else
    docker-compose logs -f "$SERVICE"
fi
EOF

# Make scripts executable
chmod +x ~/autodev-ai/*.sh

# Create project structure
echo_info "📁 Setting up project directories..."
mkdir -p ~/autodev-ai/projects/{nodejs,python,react,api}
mkdir -p ~/autodev-ai/scripts
mkdir -p ~/autodev-ai/backups

# Setup bash completion for AutoDev commands
echo_info "🔧 Setting up bash completion..."
cat >> ~/.bashrc << 'EOF'

# AutoDev-AI aliases and functions
alias autodev-start='cd ~/autodev-ai && ./start.sh'
alias autodev-stop='cd ~/autodev-ai && ./stop.sh'
alias autodev-status='cd ~/autodev-ai && ./status.sh'
alias autodev-logs='cd ~/autodev-ai && ./logs.sh'
alias autodev-cd='cd ~/autodev-ai'

# AutoDev environment
export AUTODEV_HOME=~/autodev-ai
export PATH="$AUTODEV_HOME/scripts:$PATH"
EOF

# Test Docker installation
echo_info "🧪 Testing Docker installation..."
if ! groups $USER | grep &> /dev/null '\bdocker\b'; then
    echo_warning "User $USER is not in docker group. You may need to log out and back in."
fi

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Build images (if Dockerfiles exist)
cd ~/autodev-ai
if [ -f "docker/Dockerfile.gui" ]; then
    echo_info "🏗️ Building Docker images..."
    docker build -f docker/Dockerfile.gui -t autodev-gui .
    docker build -f docker/Dockerfile.sandbox -t autodev-sandbox .
fi

# Final setup completion
echo_success "🎉 AutoDev-AI Installation Complete!"
echo ""
echo_info "📝 Next Steps:"
echo "1. Log out and back in (or run: newgrp docker)"
echo "2. Change to AutoDev directory: cd ~/autodev-ai"
echo "3. Start the infrastructure: ./start.sh"
echo "4. Check status: ./status.sh"
echo "5. View logs: ./logs.sh all"
echo ""
echo_info "📚 Documentation:"
echo "- Configuration files: ~/autodev-ai/docker/"
echo "- Projects directory: ~/autodev-ai/projects/"
echo "- Logs directory: ~/autodev-ai/logs/"
echo ""
echo_info "🌐 Default Access URLs (after starting):"
echo "- Web Interface: https://localhost:50061"
echo "- Grafana Dashboard: http://localhost:50090"
echo "- API Endpoint: http://localhost:50052"
echo ""
echo_warning "⚠️  Remember to:"
echo "- Change default passwords in production"
echo "- Configure proper SSL certificates"
echo "- Set up backup procedures"
echo "- Review firewall settings"

echo_success "Installation completed successfully! 🚀"