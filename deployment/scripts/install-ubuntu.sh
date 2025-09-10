#!/bin/bash
set -e

# AutoDev-AI Neural Bridge Platform - Ubuntu 24.04 Installation Script
# This script prepares an Ubuntu 24.04 system for AutoDev-AI deployment

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

# Configuration
DOCKER_VERSION="24.0"
NODE_VERSION="18"
POSTGRES_VERSION="15"
REDIS_VERSION="7"

log_info "🚀 AutoDev-AI Neural Bridge Platform - Ubuntu 24.04 Setup"
log_info "This script will install and configure all required dependencies"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  log_error "This script must be run as root (use sudo)"
  exit 1
fi

# Check Ubuntu version
check_ubuntu_version() {
  log_info "🔍 Checking Ubuntu version..."
  
  if [ -f /etc/lsb-release ]; then
    . /etc/lsb-release
    if [ "$DISTRIB_ID" = "Ubuntu" ] && [ "$DISTRIB_RELEASE" = "24.04" ]; then
      log_success "Ubuntu 24.04 detected"
    else
      log_warning "This script is optimized for Ubuntu 24.04. Current: $DISTRIB_ID $DISTRIB_RELEASE"
      read -p "Continue anyway? (y/N): " -n 1 -r
      echo ""
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
      fi
    fi
  else
    log_error "Cannot determine Ubuntu version"
    exit 1
  fi
}

# Update system
update_system() {
  log_info "📦 Updating system packages..."
  
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get upgrade -y
  
  # Install essential packages
  apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    tar \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    ufw \
    fail2ban \
    htop \
    iotop \
    netstat-nat \
    jq \
    tree \
    vim \
    nano
  
  log_success "System packages updated"
}

# Install Docker
install_docker() {
  log_info "🐳 Installing Docker..."
  
  # Remove old versions
  apt-get remove -y docker docker-engine docker.io containerd runc || true
  
  # Add Docker's official GPG key
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  
  # Add Docker repository
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
  
  # Install Docker Engine
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  
  # Start and enable Docker
  systemctl start docker
  systemctl enable docker
  
  # Add user to docker group (if not root)
  if [ "$SUDO_USER" ]; then
    usermod -aG docker "$SUDO_USER"
    log_info "Added $SUDO_USER to docker group (logout and login to apply)"
  fi
  
  # Install Docker Compose standalone
  DOCKER_COMPOSE_VERSION="2.23.0"
  curl -L "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
  
  log_success "Docker installed successfully"
}

# Install Node.js
install_nodejs() {
  log_info "📊 Installing Node.js $NODE_VERSION..."
  
  # Install NodeSource repository
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  
  # Install Node.js
  apt-get install -y nodejs
  
  # Install global packages
  npm install -g pm2 nodemon
  
  log_success "Node.js $(node --version) installed successfully"
}

# Configure firewall
configure_firewall() {
  log_info "🔥 Configuring firewall..."
  
  # Reset UFW to defaults
  ufw --force reset
  
  # Set default policies
  ufw default deny incoming
  ufw default allow outgoing
  
  # Allow SSH
  ufw allow ssh
  
  # Allow AutoDev-AI ports (50000-50100)
  ufw allow 50000:50100/tcp
  
  # Allow HTTP and HTTPS
  ufw allow 80/tcp
  ufw allow 443/tcp
  
  # Enable firewall
  ufw --force enable
  
  log_success "Firewall configured"
}

# Configure system limits
configure_limits() {
  log_info "⚙️  Configuring system limits..."
  
  # Increase file descriptor limits
  cat >> /etc/security/limits.conf << EOF
# AutoDev-AI limits
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOF
  
  # Configure systemd limits
  mkdir -p /etc/systemd/system.conf.d
  cat > /etc/systemd/system.conf.d/limits.conf << EOF
[Manager]
DefaultLimitNOFILE=65536
DefaultLimitNPROC=32768
EOF
  
  # Configure kernel parameters
  cat >> /etc/sysctl.conf << EOF
# AutoDev-AI kernel parameters
vm.max_map_count=262144
fs.file-max=2097152
net.core.somaxconn=65535
net.ipv4.tcp_max_syn_backlog=4096
net.core.netdev_max_backlog=5000
EOF
  
  sysctl -p
  
  log_success "System limits configured"
}

# Setup directories
setup_directories() {
  log_info "📁 Setting up directories..."
  
  # Create application directories
  mkdir -p /opt/autodev-ai
  mkdir -p /var/log/autodev-ai
  mkdir -p /var/lib/autodev-ai
  mkdir -p /var/cache/autodev-ai
  
  # Create backup directory
  mkdir -p /backup/autodev-ai
  
  # Set permissions
  if [ "$SUDO_USER" ]; then
    chown -R "$SUDO_USER":"$SUDO_USER" /opt/autodev-ai
  fi
  
  log_success "Directories created"
}

# Install monitoring tools
install_monitoring() {
  log_info "📊 Installing monitoring tools..."
  
  # Install system monitoring
  apt-get install -y \
    htop \
    iotop \
    nethogs \
    ncdu \
    glances \
    sysstat \
    dstat
  
  # Configure log rotation for AutoDev-AI
  cat > /etc/logrotate.d/autodev-ai << EOF
/var/log/autodev-ai/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        systemctl reload autodev-ai 2>/dev/null || true
    endscript
}
EOF
  
  log_success "Monitoring tools installed"
}

# Setup SSL certificates (Let's Encrypt ready)
setup_ssl() {
  log_info "🔒 Setting up SSL certificate support..."
  
  # Install certbot
  apt-get install -y certbot python3-certbot-nginx
  
  # Create SSL directory
  mkdir -p /etc/ssl/autodev-ai
  
  # Generate self-signed certificate for testing
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/autodev-ai/key.pem \
    -out /etc/ssl/autodev-ai/cert.pem \
    -subj "/C=US/ST=State/L=City/O=AutoDev-AI/CN=localhost"
  
  chmod 600 /etc/ssl/autodev-ai/key.pem
  chmod 644 /etc/ssl/autodev-ai/cert.pem
  
  log_success "SSL certificates ready"
}

# Configure swap
configure_swap() {
  log_info "💾 Configuring swap..."
  
  # Check if swap exists
  if [ $(swapon -s | wc -l) -lt 2 ]; then
    # Create 4GB swap file
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    
    # Make permanent
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    
    # Optimize swap usage
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf
    
    log_success "Swap file created (4GB)"
  else
    log_info "Swap already configured"
  fi
}

# Setup cron jobs
setup_cron() {
  log_info "⏰ Setting up cron jobs..."
  
  # Cleanup script
  cat > /usr/local/bin/autodev-cleanup.sh << 'EOF'
#!/bin/bash
# AutoDev-AI Cleanup Script

# Clean Docker
docker system prune -f --volumes
docker image prune -a -f

# Clean logs older than 30 days
find /var/log/autodev-ai -name "*.log" -mtime +30 -delete

# Clean temp files
find /tmp -name "autodev-*" -mtime +7 -delete

# Clean npm cache
npm cache clean --force
EOF

  chmod +x /usr/local/bin/autodev-cleanup.sh
  
  # Add to cron
  echo "0 2 * * 0 root /usr/local/bin/autodev-cleanup.sh" >> /etc/crontab
  
  log_success "Cron jobs configured"
}

# Create service user
create_service_user() {
  log_info "👤 Creating service user..."
  
  # Create autodev user
  if ! id "autodev" &>/dev/null; then
    useradd -r -s /bin/bash -d /opt/autodev-ai -m autodev
    usermod -aG docker autodev
    
    # Set up SSH directory
    sudo -u autodev mkdir -p /opt/autodev-ai/.ssh
    sudo -u autodev chmod 700 /opt/autodev-ai/.ssh
    
    log_success "Service user 'autodev' created"
  else
    log_info "Service user 'autodev' already exists"
  fi
}

# Final system optimization
optimize_system() {
  log_info "⚡ Optimizing system performance..."
  
  # Configure timezone
  timedatectl set-timezone UTC
  
  # Update initramfs
  update-initramfs -u
  
  # Configure automatic security updates
  cat > /etc/apt/apt.conf.d/20auto-upgrades << EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF
  
  # Configure fail2ban
  cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
EOF
  
  systemctl enable fail2ban
  systemctl restart fail2ban
  
  log_success "System optimization completed"
}

# Display installation summary
show_summary() {
  log_success "=== AutoDev-AI Ubuntu 24.04 Setup Complete ==="
  echo ""
  log_info "🎉 Installation Summary:"
  log_info "  ✅ System updated and optimized"
  log_info "  ✅ Docker $(docker --version | cut -d' ' -f3 | tr -d ',') installed"
  log_info "  ✅ Node.js $(node --version) installed"
  log_info "  ✅ Firewall configured (ports 50000-50100 open)"
  log_info "  ✅ System limits optimized"
  log_info "  ✅ Monitoring tools installed"
  log_info "  ✅ SSL certificate support ready"
  log_info "  ✅ Service user 'autodev' created"
  echo ""
  log_info "📋 Next Steps:"
  log_info "  1. Clone AutoDev-AI repository to /opt/autodev-ai"
  log_info "  2. Configure environment variables"
  log_info "  3. Run deployment script"
  echo ""
  log_info "🔧 Useful Commands:"
  log_info "  sudo systemctl status docker"
  log_info "  sudo ufw status"
  log_info "  docker --version"
  log_info "  docker-compose --version"
  echo ""
  log_warning "⚠️  Please reboot the system to ensure all changes take effect"
}

# Main installation flow
main() {
  log_info "Starting AutoDev-AI Ubuntu 24.04 installation..."
  
  check_ubuntu_version
  update_system
  install_docker
  install_nodejs
  configure_firewall
  configure_limits
  configure_swap
  setup_directories
  install_monitoring
  setup_ssl
  setup_cron
  create_service_user
  optimize_system
  show_summary
  
  log_success "AutoDev-AI system setup completed successfully!"
}

# Run main function
main "$@"