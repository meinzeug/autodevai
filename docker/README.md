# AutoDev-AI Docker Infrastructure

Production-grade containerization and infrastructure setup for the AutoDev-AI Neural Bridge Platform.

## 🚀 Quick Start

### Development Environment
```bash
# Start development environment with hot reloading
cd docker
cp .env.development .env
docker-compose up

# Access services:
# - Main App: http://localhost:50000
# - API: http://localhost:50001
# - PgAdmin: http://localhost:50094 (admin@autodev.ai / admin)
# - Redis Commander: http://localhost:50095
# - Grafana: http://localhost:50090 (admin / admin)
# - MailHog: http://localhost:50093
```

### Production Deployment
```bash
# Production deployment
cd docker
cp .env.production .env
# Edit .env with production values (CHANGE ALL PASSWORDS!)
docker-compose -f docker-compose.prod.yml up -d

# Access services:
# - Main App: http://localhost:50080
# - HTTPS: https://localhost:50081
# - Grafana: http://localhost:50090
# - Prometheus: http://localhost:50091
```

## 📊 Port Allocation (50000-50100)

| Service | Port | Purpose |
|---------|------|---------|
| **Core Application** |
| Main GUI | 50000 | Primary web interface |
| API Server | 50001 | REST API endpoints |
| WebSocket | 50002 | Real-time communication |
| Metrics | 50003 | Application metrics |
| Claude Flow | 50004 | Swarm coordination |
| Neural Bridge | 50005-50006 | Neural processing |
| **Project Sandboxes** |
| Dynamic Range | 50010-50089 | Project containers (80 slots) |
| **Infrastructure** |
| PostgreSQL | 50050 | Primary database |
| Redis | 50051 | Cache and sessions |
| Nginx HTTP | 50080 | Reverse proxy |
| Nginx HTTPS | 50081 | SSL termination |
| **Monitoring** |
| Grafana | 50090 | Dashboards and visualization |
| Prometheus | 50091 | Metrics collection |
| **Development Tools** |
| MailHog SMTP | 50092 | Email testing |
| MailHog Web | 50093 | Email UI |
| PgAdmin | 50094 | Database admin |
| Redis Commander | 50095 | Redis admin |

## 🏗️ Architecture Overview

### Multi-Stage Docker Builds
- **Frontend Builder**: Node.js 18 Alpine with Vite/React build
- **Rust Builder**: Optimized Tauri compilation with caching
- **Runtime**: Minimal Alpine with security hardening

### Network Architecture
- **Bridge Network**: `172.20.0.0/16` subnet
- **Container Isolation**: Security policies and non-root users
- **Service Discovery**: DNS-based container communication
- **Load Balancing**: Nginx reverse proxy with health checks

### Data Persistence
- **Application Data**: `/app/data` volume
- **Logs**: Structured logging with Vector aggregation
- **Database**: PostgreSQL with backup-ready volumes
- **Cache**: Redis with AOF persistence

## 🔒 Security Features

### Container Security
- **Non-root users** in all containers
- **Read-only filesystems** where possible
- **Capability dropping** (ALL) with minimal additions
- **Security options**: `no-new-privileges:true`
- **Resource limits** for DOS protection

### Network Security
- **Custom bridge network** with subnet isolation
- **Firewall-ready** port allocation
- **SSL/TLS termination** at Nginx
- **Rate limiting** on API endpoints

### Data Security
- **Environment-based secrets** management
- **Database connection encryption**
- **JWT-based authentication**
- **CORS configuration**

## 📈 Monitoring Stack

### Metrics Collection
- **Prometheus**: Time-series metrics storage
- **Node Exporter**: Host system metrics
- **cAdvisor**: Container resource metrics
- **Custom Exporters**: PostgreSQL, Redis, Nginx

### Log Aggregation
- **Vector**: High-performance log processing
- **Structured Logging**: JSON format with metadata
- **Log Rotation**: Automated compression and archival
- **Alerting**: Critical event notifications

### Visualization
- **Grafana**: Dashboards and alerting
- **Pre-configured**: AutoDev-AI specific dashboards
- **Data Sources**: Prometheus, PostgreSQL, Redis
- **Alerting Rules**: Performance and error thresholds

## 🛠️ Development Features

### Hot Reloading
- **Frontend**: Vite HMR on port 3001
- **Backend**: Cargo watch for Rust rebuilds
- **Volume Mounts**: Live code synchronization
- **Debug Modes**: Enhanced logging and inspection

### Development Tools
- **PgAdmin**: Database administration interface
- **Redis Commander**: Redis key management
- **MailHog**: Email testing without SMTP setup
- **Debug Ports**: Node.js inspector on 9229

### Testing Environment
- **Isolated Database**: `autodev_ai_dev` with sample data
- **Relaxed Security**: Development-friendly settings
- **Mock Services**: Email and external API simulation

## 🚀 Deployment Options

### Local Development
```bash
# Standard development with override
docker-compose up

# Development with production database
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Specific services only
docker-compose up postgres redis grafana
```

### Production Variants
```bash
# Full production stack
docker-compose -f docker-compose.prod.yml up -d

# Production without monitoring (minimal)
docker-compose -f docker-compose.yml up autodev-ai postgres redis nginx

# Scaling specific services
docker-compose -f docker-compose.prod.yml up -d --scale autodev-ai=3
```

### Cloud Deployment
- **Docker Swarm**: Production orchestration ready
- **Kubernetes**: Helm charts available (separate repo)
- **AWS ECS**: Task definitions included
- **Azure Container Instances**: ARM templates provided

## 🔧 Configuration Management

### Environment Files
- `.env.development`: Development settings
- `.env.production`: Production configuration
- `.env.local`: Local overrides (gitignored)

### Key Configuration Areas
1. **Database**: Connection strings, pooling, SSL
2. **Cache**: Redis clustering, persistence, auth
3. **Monitoring**: Retention, scrape intervals, alerting
4. **Security**: JWT secrets, CORS, rate limiting
5. **Features**: Neural training, distributed computing

### Secrets Management
```bash
# Generate secure secrets
openssl rand -hex 32  # JWT_SECRET
openssl rand -base64 32  # Database passwords
pwgen -s 64 1  # General purpose secrets
```

## 📊 Performance Optimization

### Resource Allocation
- **CPU Limits**: Prevents container CPU starvation
- **Memory Limits**: OOMKiller protection
- **Disk I/O**: Volume optimization and caching
- **Network**: Connection pooling and keep-alive

### Database Tuning
- **PostgreSQL**: Optimized for OLTP workloads
- **Connection Pooling**: pgBouncer configuration ready
- **Read Replicas**: Master-slave setup supported
- **Backup Strategy**: Point-in-time recovery enabled

### Cache Strategy
- **Redis**: LRU eviction with optimal memory usage
- **Application Cache**: Multi-level caching strategy
- **CDN Ready**: Static asset optimization
- **Session Store**: Distributed session management

## 🔍 Troubleshooting

### Common Issues
```bash
# Check container logs
docker-compose logs -f autodev-ai

# Database connection issues
docker-compose exec postgres pg_isready -U autodev_user

# Redis connectivity
docker-compose exec redis redis-cli ping

# Network debugging
docker network inspect autodev_network
```

### Health Checks
```bash
# Application health
curl http://localhost:50000/health

# Service discovery
docker-compose exec autodev-ai nslookup postgres

# Resource usage
docker stats
```

### Performance Monitoring
```bash
# Real-time metrics
docker-compose exec prometheus promtool query instant 'up'

# Database performance
docker-compose exec postgres pg_stat_activity

# Cache hit rates
docker-compose exec redis redis-cli info stats
```

## 🚀 Production Checklist

### Pre-Deployment
- [ ] Change all default passwords in `.env.production`
- [ ] Generate secure JWT secrets
- [ ] Configure SSL certificates
- [ ] Set up external backup storage
- [ ] Configure monitoring alerts
- [ ] Test disaster recovery procedures

### Security Hardening
- [ ] Enable firewall rules for port 50000-50100
- [ ] Configure fail2ban for authentication attempts
- [ ] Set up intrusion detection
- [ ] Enable audit logging
- [ ] Configure vulnerability scanning

### Monitoring Setup
- [ ] Configure Grafana dashboards
- [ ] Set up alerting rules
- [ ] Configure log retention policies
- [ ] Set up external monitoring (optional)
- [ ] Configure backup monitoring

### Performance Tuning
- [ ] Database query optimization
- [ ] Redis memory optimization
- [ ] Nginx caching configuration
- [ ] Container resource limits
- [ ] Network performance tuning

## 📚 Additional Resources

- [Docker Best Practices](../docs/docker-best-practices.md)
- [Security Hardening Guide](../docs/security-hardening.md)
- [Monitoring Playbook](../docs/monitoring-playbook.md)
- [Disaster Recovery Plan](../docs/disaster-recovery.md)
- [Performance Tuning Guide](../docs/performance-tuning.md)

## 🤝 Contributing

1. Test changes in development environment
2. Update documentation for new services
3. Follow security best practices
4. Add monitoring for new components
5. Test production deployment locally

## 📝 License

MIT License - see [LICENSE](../LICENSE) for details.