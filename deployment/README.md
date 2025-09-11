# AutoDev-AI Neural Bridge Platform - Deployment Guide

## 🚀 Production Deployment Guide

This directory contains all the necessary files and scripts for deploying the AutoDev-AI Neural
Bridge Platform in production environments.

## 📋 Prerequisites

### System Requirements (Ubuntu 24.04 LTS Recommended)

- **CPU**: 4+ cores (8+ recommended)
- **RAM**: 8GB minimum (16GB+ recommended)
- **Storage**: 100GB minimum (SSD recommended)
- **Network**: Ports 50000-50100 available
- **OS**: Ubuntu 24.04 LTS (tested) or compatible Linux distribution

### Required Software

- Docker 24.0+
- Docker Compose 2.23+
- Node.js 18+
- Git
- curl/wget
- openssl

## 🛠️ Quick Start

### 1. System Preparation (Ubuntu 24.04)

```bash
# Run the automated Ubuntu setup script
sudo ./deployment/scripts/install-ubuntu.sh

# The script will:
# - Update system packages
# - Install Docker and Docker Compose
# - Install Node.js 18
# - Configure firewall (ports 50000-50100)
# - Optimize system settings
# - Create service user 'autodev'
# - Setup monitoring tools
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env.production

# Edit production environment variables
nano .env.production
```

**Required Environment Variables:**

```env
# Database
DB_PASSWORD=your_secure_db_password
POSTGRES_DB=autodev_ai
POSTGRES_USER=autodev

# Redis
REDIS_PASSWORD=your_secure_redis_password

# Security
JWT_SECRET=your_jwt_secret_key_here
ENCRYPTION_KEY=your_encryption_key_here

# AI Services
CLAUDE_API_KEY=your_claude_api_key
OPENAI_API_KEY=your_openai_api_key

# Monitoring
GRAFANA_PASSWORD=your_grafana_admin_password

# Notifications (Optional)
NOTIFICATION_EMAIL=admin@yourdomain.com
SLACK_WEBHOOK=https://hooks.slack.com/...
DISCORD_WEBHOOK=https://discord.com/api/webhooks/...

# Backup (Optional)
REMOTE_BACKUP_ENABLED=true
S3_BUCKET=your-backup-bucket
AWS_REGION=us-east-1
```

### 3. SSL Certificate Setup

```bash
# For production with domain name
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates to deployment directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem deployment/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem deployment/nginx/ssl/key.pem
```

### 4. Deploy Application

```bash
# Make deployment script executable
chmod +x deployment/scripts/deploy.sh

# Deploy to production
./deployment/scripts/deploy.sh -e production

# Or deploy with specific version
./deployment/scripts/deploy.sh -e production -v v1.0.0
```

## 📊 Service Architecture

### Port Configuration (50000-50100)

- **50000**: Main Application (HTTP/HTTPS via Nginx)
- **50001**: PostgreSQL Database
- **50002**: Redis Cache
- **50003**: Nginx Load Balancer (HTTP)
- **50004**: Nginx Load Balancer (HTTPS)
- **50005**: Prometheus Monitoring
- **50006**: Grafana Dashboard
- **50007**: Elasticsearch
- **50008**: Logstash
- **50009**: Kibana
- **50010-50090**: Dynamic Sandbox Ports
- **50091-50100**: Reserved for scaling

### Service Stack

```
┌─────────────────────────────────────────────┐
│             Nginx Load Balancer             │
│          (SSL Termination, Caching)        │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│          AutoDev-AI Application             │
│     (Node.js, React, Tauri Desktop)        │
└─────┬───────────────────────────────┬───────┘
      │                               │
┌─────▼────────┐              ┌──────▼────────┐
│ PostgreSQL   │              │ Redis Cache   │
│ Database     │              │ Session Store │
└──────────────┘              └───────────────┘
      │
┌─────▼────────────────────────────────────────┐
│            Sandbox Manager                   │
│      (Docker-in-Docker Isolation)           │
└──────────────────────────────────────────────┘
      │
┌─────▼────────────────────────────────────────┐
│         Monitoring Stack                     │
│  Prometheus + Grafana + ELK Stack           │
└──────────────────────────────────────────────┘
```

## 🔧 Configuration Files

### Docker Compose

- `docker/docker-compose.prod.yml` - Production stack definition
- `docker/Dockerfile` - Main application container
- `docker/Dockerfile.sandbox` - Sandbox manager container

### Nginx

- `nginx/nginx.conf` - Load balancer and reverse proxy configuration
- SSL/TLS termination
- Rate limiting and security headers
- WebSocket support for real-time features

### Monitoring

- `monitoring/prometheus.yml` - Metrics collection configuration
- `monitoring/grafana/` - Dashboard definitions
- `monitoring/logstash/` - Log processing pipeline

## 📦 Backup Strategy

### Automated Backups

```bash
# Manual backup
./deployment/backup/backup-strategy.sh

# Setup automated daily backups
sudo crontab -e
# Add: 0 2 * * * /opt/autodev-ai/deployment/backup/backup-strategy.sh
```

### Backup Components

- **Database**: PostgreSQL dumps with schema and data
- **Volumes**: All Docker volumes (uploads, logs, configs)
- **Configuration**: Environment files and system configs
- **Application**: Source code and dependencies
- **System**: Container logs and system information

### Backup Storage

- **Local**: Encrypted backups with rotation (30 days)
- **Remote**: S3-compatible storage (optional)
- **Retention**: Daily (30 days), Weekly (12 weeks), Monthly (12 months)

## 🔍 Monitoring & Observability

### Metrics Collection

- **Application Metrics**: Custom business metrics
- **System Metrics**: CPU, memory, disk, network
- **Container Metrics**: Docker container performance
- **Database Metrics**: PostgreSQL performance and queries
- **Cache Metrics**: Redis performance and hit rates

### Alerting

- **Health Checks**: Service availability monitoring
- **Performance**: Response time and throughput alerts
- **Resource Usage**: CPU, memory, and disk alerts
- **Error Rates**: Application and system error monitoring

### Dashboards

- **Overview**: System health and key metrics
- **Application**: Business metrics and user activity
- **Infrastructure**: System resources and performance
- **Sandbox**: Container and isolation metrics

## 🔒 Security Considerations

### Network Security

- Firewall configuration (UFW)
- Internal network isolation
- Rate limiting and DDoS protection
- SSL/TLS encryption

### Application Security

- JWT token authentication
- API rate limiting
- Input validation and sanitization
- Secure headers and CORS policies

### Data Security

- Database encryption at rest
- Backup encryption
- Secret management
- Access control and permissions

### Container Security

- Non-root user execution
- Resource limits and constraints
- Image vulnerability scanning
- Isolated sandbox environments

## 📈 Scaling Strategies

### Horizontal Scaling

```yaml
# Scale application instances
docker-compose up -d --scale autodev-ai=3

# Load balancing configuration
upstream autodev_backend {
    server autodev-ai-1:3000;
    server autodev-ai-2:3000;
    server autodev-ai-3:3000;
}
```

### Database Scaling

- Read replicas for query distribution
- Connection pooling optimization
- Query performance tuning
- Backup and maintenance windows

### Cache Scaling

- Redis Cluster for high availability
- Cache warming strategies
- TTL optimization
- Memory usage monitoring

### Storage Scaling

- Volume expansion strategies
- S3 integration for object storage
- CDN integration for static assets
- Archive and cleanup policies

## 🚨 Disaster Recovery

### Recovery Procedures

1. **Database Recovery**: Restore from encrypted backups
2. **Volume Recovery**: Restore Docker volumes
3. **Configuration Recovery**: Restore environment and configs
4. **Application Recovery**: Redeploy from source or images

### RTO/RPO Targets

- **Recovery Time Objective (RTO)**: < 1 hour
- **Recovery Point Objective (RPO)**: < 24 hours
- **Backup Frequency**: Daily with incremental options
- **Testing Schedule**: Monthly recovery drills

## 🔧 Maintenance

### Regular Maintenance Tasks

```bash
# System updates
sudo apt update && sudo apt upgrade -y

# Docker cleanup
docker system prune -af

# Log rotation
sudo logrotate -f /etc/logrotate.conf

# Security updates
sudo unattended-upgrades --dry-run
```

### Performance Optimization

- Database query optimization
- Index analysis and maintenance
- Cache hit ratio analysis
- Resource usage monitoring

## 📞 Support & Troubleshooting

### Log Locations

- **Application Logs**: `/var/log/autodev-ai/`
- **Docker Logs**: `docker-compose logs -f`
- **System Logs**: `/var/log/syslog`
- **Nginx Logs**: `/var/log/nginx/`

### Common Issues

1. **Port Conflicts**: Check port availability with `netstat -tlnp`
2. **Docker Issues**: Verify Docker daemon status
3. **Database Connections**: Check PostgreSQL container health
4. **SSL Certificate**: Verify certificate validity and paths

### Health Check Endpoints

- **Application**: `http://localhost:50000/health`
- **Database**: Direct PostgreSQL connection test
- **Redis**: `redis-cli ping`
- **Monitoring**: Prometheus and Grafana dashboards

### Contact Information

- **Documentation**: Repository README and Wiki
- **Issues**: GitHub Issues tracker
- **Emergency**: System administrator contacts

## 📄 License

This deployment configuration is part of the AutoDev-AI Neural Bridge Platform and is subject to the
project's MIT license.
