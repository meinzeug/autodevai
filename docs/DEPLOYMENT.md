# AutoDev-AI Neural Bridge Platform - Deployment Guide

Complete deployment guide for Ubuntu 24.04 production environments.

## Table of Contents

- [System Requirements](#system-requirements)
- [Pre-Installation Setup](#pre-installation-setup)
- [Docker Deployment](#docker-deployment)
- [Tauri Application Setup](#tauri-application-setup)
- [Environment Configuration](#environment-configuration)
- [Production Checklist](#production-checklist)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

## System Requirements

### Minimum Requirements

- **OS**: Ubuntu 24.04 LTS (Recommended: 24.04.1+)
- **CPU**: 4 cores, 2.4GHz
- **RAM**: 8GB (Recommended: 16GB+)
- **Storage**: 50GB SSD (Recommended: 100GB+ NVMe)
- **Network**: 1Gbps connection with ports 50000-50100 available

### Production Requirements

- **CPU**: 8+ cores, 3.2GHz+
- **RAM**: 32GB+
- **Storage**: 200GB+ NVMe SSD
- **Network**: 10Gbps with load balancer
- **Backup**: Automated daily backups

## Pre-Installation Setup

### 1. System Update

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git build-essential \
  software-properties-common apt-transport-https \
  ca-certificates gnupg lsb-release
```

### 2. Install Docker & Docker Compose

```bash
# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Configure Docker for non-root user
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

### 3. Install Node.js & Rust (for Tauri)

```bash
# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source ~/.cargo/env

# Install Tauri prerequisites
sudo apt install -y libwebkit2gtk-4.0-dev libgtk-3-dev \
  libayatana-appindicator3-dev librsvg2-dev

# Verify installations
node --version
npm --version
rustc --version
cargo --version
```

## Docker Deployment

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/meinzeug/autodevai.git
cd autodevai

# Make scripts executable
chmod +x src-tauri/scripts/*.sh
chmod +x src-tauri/*.sh
```

### 2. Configure Environment Variables

```bash
# Create production environment file
cp docker/.env.example docker/.env.production

# Edit environment variables
nano docker/.env.production
```

**Required Environment Variables:**

```bash
# Database Configuration
POSTGRES_DB=autodevai
POSTGRES_USER=autodevai_user
POSTGRES_PASSWORD=your_secure_password_here

# Redis Configuration
REDIS_PASSWORD=your_redis_password_here

# Monitoring Configuration
GRAFANA_USER=admin
GRAFANA_PASSWORD=your_grafana_password_here
GRAFANA_SECRET_KEY=your_secret_key_here

# Application Configuration
DATA_PATH=/opt/autodevai/data
LOGS_PATH=/opt/autodevai/logs

# API Keys (Optional - configure via UI)
OPENROUTER_API_KEY=your_openrouter_key
CLAUDE_API_KEY=your_claude_key
```

### 3. Port Configuration (50000-50100)

```bash
# Verify ports are available
sudo netstat -tlnp | grep -E ":(50[0-9][0-9][0-9])"

# Configure firewall
sudo ufw allow 50000:50100/tcp
sudo ufw enable
```

**Port Allocation:**

- `50000`: Main GUI Application
- `50001`: API Server
- `50002`: WebSocket Server
- `50003`: Metrics Endpoint
- `50010-50089`: Dynamic Project Sandboxes
- `50050`: PostgreSQL Database
- `50051`: Redis Cache
- `50080`: Nginx HTTP
- `50081`: Nginx HTTPS
- `50090`: Grafana Dashboard
- `50091`: Prometheus Metrics

### 4. Deploy with Docker Compose

```bash
# Build and start services
docker compose -f docker/docker-compose.prod.yml up -d

# Verify all services are running
docker compose -f docker/docker-compose.prod.yml ps

# Check logs
docker compose -f docker/docker-compose.prod.yml logs -f autodev-ai

# Wait for health checks
docker compose -f docker/docker-compose.prod.yml logs | grep -i healthy
```

### 5. Initialize Database

```bash
# Run database migrations
docker compose -f docker/docker-compose.prod.yml exec autodev-ai ./autodev-ai --migrate

# Verify database connection
docker compose -f docker/docker-compose.prod.yml exec postgres psql -U autodevai_user -d autodevai -c "\\dt"
```

## Tauri Application Setup

### 1. Build Tauri Application

```bash
# Install dependencies
npm install

# Build frontend
npm run build

# Build Tauri application
cd src-tauri
cargo tauri build --release

# The binary will be in src-tauri/target/release/
```

### 2. Install Application

```bash
# Install system-wide (Ubuntu)
sudo cp target/release/neural-bridge-platform /usr/local/bin/autodev-ai
sudo chmod +x /usr/local/bin/autodev-ai

# Create desktop entry
sudo tee /usr/share/applications/autodev-ai.desktop > /dev/null <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=AutoDev-AI Neural Bridge
Comment=Neural Bridge Platform for AI Development
Exec=/usr/local/bin/autodev-ai
Icon=/opt/autodevai/icons/icon.png
Terminal=false
Categories=Development;
EOF
```

### 3. Create Systemd Service

```bash
# Create service file
sudo tee /etc/systemd/system/autodev-ai.service > /dev/null <<EOF
[Unit]
Description=AutoDev-AI Neural Bridge Platform
After=network.target docker.service
Requires=docker.service

[Service]
Type=exec
User=autodev
Group=autodev
WorkingDirectory=/opt/autodevai
ExecStart=/usr/local/bin/autodev-ai --server-mode --port 50000
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=autodev-ai

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/opt/autodevai

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable autodev-ai
sudo systemctl start autodev-ai
sudo systemctl status autodev-ai
```

## Environment Configuration

### 1. Application Configuration

Create `/opt/autodevai/config/app.json`:

```json
{
  "server": {
    "host": "0.0.0.0",
    "port": 50000,
    "ssl": false,
    "corsOrigins": ["http://localhost:1420", "https://your-domain.com"]
  },
  "docker": {
    "enabled": true,
    "portRange": [50010, 50089],
    "networkName": "autodev_network",
    "maxContainers": 10
  },
  "storage": {
    "dataPath": "/opt/autodevai/data",
    "logsPath": "/opt/autodevai/logs",
    "cachePath": "/opt/autodevai/cache",
    "maxLogSize": "100MB",
    "maxCacheSize": "1GB"
  },
  "security": {
    "enableHttps": true,
    "jwtSecret": "your-jwt-secret-here",
    "sessionTimeout": 3600,
    "rateLimitRequests": 1000,
    "rateLimitWindow": 3600
  }
}
```

### 2. SSL/TLS Configuration (Production)

```bash
# Generate SSL certificates (Let's Encrypt recommended)
sudo apt install -y certbot

# Obtain certificates
sudo certbot certonly --standalone -d your-domain.com

# Configure Nginx SSL
sudo cp docker/nginx-ssl.conf /etc/nginx/sites-available/autodev-ai
sudo ln -s /etc/nginx/sites-available/autodev-ai /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 3. Monitoring Configuration

```bash
# Configure Prometheus targets
cat > docker/prometheus.yml <<EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "/etc/prometheus/rules/*.yml"

scrape_configs:
  - job_name: 'autodev-ai'
    static_configs:
      - targets: ['autodev-ai:50003']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['host.docker.internal:9100']
EOF
```

## Production Checklist

### Pre-Deployment

- [ ] System requirements verified
- [ ] All dependencies installed
- [ ] Docker and Docker Compose functional
- [ ] Ports 50000-50100 available and configured
- [ ] SSL certificates obtained (if using HTTPS)
- [ ] Environment variables configured
- [ ] Backup strategy implemented

### Deployment

- [ ] Repository cloned and updated
- [ ] Environment files configured
- [ ] Docker images built successfully
- [ ] All containers started and healthy
- [ ] Database migrations completed
- [ ] Tauri application built and installed
- [ ] Systemd service configured and running

### Post-Deployment

- [ ] All services accessible on configured ports
- [ ] Health checks passing
- [ ] Monitoring dashboards functional
- [ ] Log aggregation working
- [ ] Backup jobs scheduled
- [ ] Security scans completed
- [ ] Performance benchmarks established
- [ ] Documentation updated

### Security Hardening

- [ ] Firewall configured (UFW/iptables)
- [ ] Non-root user for application services
- [ ] Container security policies applied
- [ ] SSL/TLS certificates valid
- [ ] Secrets management implemented
- [ ] Regular security updates scheduled
- [ ] Intrusion detection configured
- [ ] Audit logging enabled

## Monitoring & Maintenance

### 1. Health Monitoring

```bash
# Check all services
docker compose -f docker/docker-compose.prod.yml ps

# Check application health
curl -f http://localhost:50000/health || echo "Service unhealthy"

# Monitor logs
docker compose -f docker/docker-compose.prod.yml logs -f --tail=100

# Check system resources
docker stats
```

### 2. Automated Backups

```bash
# Create backup script
sudo tee /opt/autodevai/scripts/backup.sh > /dev/null <<'EOF'
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/opt/autodevai/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
docker compose -f docker/docker-compose.prod.yml exec -T postgres \
  pg_dump -U autodevai_user autodevai | gzip > \
  "$BACKUP_DIR/postgres_$TIMESTAMP.sql.gz"

# Backup application data
tar -czf "$BACKUP_DIR/data_$TIMESTAMP.tar.gz" /opt/autodevai/data

# Cleanup old backups (keep 30 days)
find "$BACKUP_DIR" -name "*.gz" -mtime +30 -delete

echo "Backup completed: $TIMESTAMP"
EOF

chmod +x /opt/autodevai/scripts/backup.sh

# Schedule daily backups
echo "0 2 * * * /opt/autodevai/scripts/backup.sh >> /var/log/autodev-backup.log 2>&1" | sudo crontab -
```

### 3. Monitoring Dashboards

- **Grafana**: http://localhost:50090 (admin/your_password)
- **Prometheus**: http://localhost:50091
- **Application Metrics**: http://localhost:50003/metrics

### 4. Log Analysis

```bash
# Application logs
docker compose -f docker/docker-compose.prod.yml logs autodev-ai

# Database logs
docker compose -f docker/docker-compose.prod.yml logs postgres

# System logs
sudo journalctl -u autodev-ai -f

# Nginx access logs
docker compose -f docker/docker-compose.prod.yml exec nginx tail -f /var/log/nginx/access.log
```

## Troubleshooting

### Common Issues

#### 1. Port Conflicts

```bash
# Check what's using ports
sudo netstat -tlnp | grep :50000

# Kill conflicting processes
sudo pkill -f "process_name"

# Restart services
docker compose -f docker/docker-compose.prod.yml restart
```

#### 2. Container Health Checks Failing

```bash
# Check container logs
docker compose -f docker/docker-compose.prod.yml logs [service_name]

# Inspect container
docker inspect [container_name]

# Restart unhealthy containers
docker compose -f docker/docker-compose.prod.yml restart [service_name]
```

#### 3. Database Connection Issues

```bash
# Test database connection
docker compose -f docker/docker-compose.prod.yml exec postgres \
  psql -U autodevai_user -d autodevai -c "SELECT version();"

# Check database logs
docker compose -f docker/docker-compose.prod.yml logs postgres

# Reset database (CAUTION: Data loss)
docker compose -f docker/docker-compose.prod.yml down -v
docker compose -f docker/docker-compose.prod.yml up -d
```

#### 4. Memory/CPU Issues

```bash
# Monitor resource usage
docker stats

# Adjust container limits in docker-compose.prod.yml
# Restart services with new limits
docker compose -f docker/docker-compose.prod.yml up -d
```

### Emergency Recovery

#### 1. Rollback Deployment

```bash
# Stop current deployment
docker compose -f docker/docker-compose.prod.yml down

# Restore from backup
cd /opt/autodevai/backups
# Restore latest backup...

# Restart with previous version
git checkout [previous_tag]
docker compose -f docker/docker-compose.prod.yml up -d
```

#### 2. Disaster Recovery

```bash
# Full system restore
sudo systemctl stop autodev-ai
docker compose -f docker/docker-compose.prod.yml down -v

# Restore data from backup
tar -xzf /opt/autodevai/backups/data_[timestamp].tar.gz -C /

# Restore database
zcat /opt/autodevai/backups/postgres_[timestamp].sql.gz | \
  docker compose -f docker/docker-compose.prod.yml exec -T postgres \
  psql -U autodevai_user -d autodevai

# Restart services
docker compose -f docker/docker-compose.prod.yml up -d
sudo systemctl start autodev-ai
```

### Performance Optimization

#### 1. Docker Optimization

```bash
# Optimize Docker daemon
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "storage-opts": [
    "overlay2.override_kernel_check=true"
  ],
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  }
}
EOF

sudo systemctl restart docker
```

#### 2. System Tuning

```bash
# Optimize kernel parameters
sudo tee -a /etc/sysctl.conf > /dev/null <<EOF
# Network optimization
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 12582912 16777216
net.ipv4.tcp_wmem = 4096 12582912 16777216

# File descriptor limits
fs.file-max = 2097152

# Memory management
vm.swappiness = 10
vm.max_map_count = 262144
EOF

sudo sysctl -p
```

## Support & Maintenance

### Regular Maintenance Tasks

- **Daily**: Monitor dashboards, check logs
- **Weekly**: Review performance metrics, update security patches
- **Monthly**: Backup verification, capacity planning
- **Quarterly**: Security audits, dependency updates

### Support Resources

- **Documentation**: `/opt/autodevai/docs/`
- **Logs**: `/opt/autodevai/logs/`
- **Configuration**: `/opt/autodevai/config/`
- **GitHub Issues**: https://github.com/meinzeug/autodevai/issues

For additional support, please refer to the [User Guide](USER_GUIDE.md) and
[Contributing Guidelines](CONTRIBUTING.md).
