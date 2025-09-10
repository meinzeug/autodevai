# AutoDev-AI Infrastructure

Complete infrastructure setup for the AutoDev-AI Neural Bridge Platform with production-ready configurations.

## 📁 Directory Structure

```
infrastructure/
├── docker/                 # Docker Compose deployment
│   ├── docker-compose.yml  # Main compose configuration
│   ├── Dockerfile.gui      # GUI application container
│   └── Dockerfile.sandbox  # Sandbox manager container
├── kubernetes/             # Kubernetes manifests
│   ├── namespace.yaml      # Namespace definition
│   ├── configmaps.yaml     # Configuration maps
│   ├── secrets.yaml        # Secrets (template)
│   ├── postgres.yaml       # PostgreSQL StatefulSet
│   ├── redis.yaml          # Redis StatefulSet
│   ├── autodevai-gui.yaml  # Main application deployment
│   ├── sandbox-manager.yaml # Sandbox manager deployment
│   ├── nginx.yaml          # Reverse proxy
│   └── monitoring.yaml     # Grafana and Prometheus
├── terraform/              # Cloud infrastructure
│   ├── main.tf            # Main Terraform configuration
│   ├── variables.tf       # Variable definitions
│   ├── eks.tf             # EKS cluster configuration
│   ├── rds.tf             # PostgreSQL RDS setup
│   ├── elasticache.tf     # Redis ElastiCache
│   ├── additional-services.tf # Load balancer, S3, etc.
│   └── outputs.tf         # Output values
├── nginx/                 # Nginx configuration
│   └── nginx.conf         # Reverse proxy config
├── ssl/                   # SSL/TLS setup
│   ├── generate-certs.sh  # Self-signed certificate generator
│   └── setup-letsencrypt.sh # Let's Encrypt automation
├── configs/               # Service configurations
│   ├── postgres/          # PostgreSQL configs
│   └── redis/             # Redis configuration
├── scripts/               # Deployment automation
│   ├── deploy.sh          # Main deployment script
│   └── destroy.sh         # Infrastructure destruction
└── monitoring/            # Monitoring configurations
```

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended for Development)

```bash
# Generate SSL certificates
cd infrastructure/ssl
chmod +x generate-certs.sh
./generate-certs.sh autodev.ai

# Deploy with Docker Compose
cd infrastructure/scripts
chmod +x deploy.sh
./deploy.sh docker dev localhost
```

Access the application at: http://localhost:50060

### Option 2: Kubernetes (Production)

```bash
# Prerequisites: kubectl and Kubernetes cluster access
# Deploy to Kubernetes
cd infrastructure/scripts
chmod +x deploy.sh
./deploy.sh kubernetes prod autodev.ai
```

### Option 3: Terraform + AWS (Cloud Production)

```bash
# Prerequisites: AWS CLI, Terraform, kubectl
# Configure AWS credentials
aws configure

# Deploy infrastructure
cd infrastructure/scripts
chmod +x deploy.sh
./deploy.sh terraform prod autodev.ai
```

## 🏗️ Architecture Overview

### Port Allocation
- **50060**: Main application port (Nginx reverse proxy)
- **50000**: Direct GUI access
- **50010-50089**: Sandbox port range (80 concurrent sandboxes)
- **50050**: PostgreSQL
- **50051**: Redis
- **50090**: Grafana monitoring
- **50091**: Prometheus metrics

### Components

#### Core Services
- **GUI Application**: Next.js/React frontend with Tauri backend
- **Sandbox Manager**: Dynamic container orchestration
- **PostgreSQL**: Primary database
- **Redis**: Caching and message broker
- **Nginx**: Reverse proxy and load balancer

#### Monitoring Stack
- **Grafana**: Dashboards and visualization
- **Prometheus**: Metrics collection
- **Node Exporter**: System metrics

## 🔧 Configuration

### Environment Variables

Create `.env.prod` (or `.env.dev`, `.env.staging`) with:

```env
# Core Configuration
NODE_ENV=production
DOMAIN=autodev.ai
PORT=50060

# Database
DATABASE_URL=postgresql://autodevai:password@postgres:5432/autodevai

# Redis
REDIS_URL=redis://:password@redis:6379

# Security
JWT_SECRET=your-secure-jwt-secret

# API Keys
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-...

# Sandbox Configuration
SANDBOX_PORT_RANGE_START=50010
SANDBOX_PORT_RANGE_END=50089
MAX_CONCURRENT_SANDBOXES=80
```

### SSL/TLS Setup

#### Development (Self-signed certificates)
```bash
cd infrastructure/ssl
./generate-certs.sh your-domain.com
```

#### Production (Let's Encrypt)
```bash
cd infrastructure/ssl
./setup-letsencrypt.sh your-domain.com admin@your-domain.com prod
```

## ☸️ Kubernetes Deployment

### Prerequisites
- Kubernetes cluster (EKS, GKE, or local)
- kubectl configured
- Helm 3.x (for monitoring stack)

### Deployment Steps

1. **Create namespace and apply configurations:**
```bash
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/configmaps.yaml
kubectl apply -f kubernetes/secrets.yaml
```

2. **Deploy databases:**
```bash
kubectl apply -f kubernetes/postgres.yaml
kubectl apply -f kubernetes/redis.yaml
```

3. **Deploy applications:**
```bash
kubectl apply -f kubernetes/autodevai-gui.yaml
kubectl apply -f kubernetes/sandbox-manager.yaml
kubectl apply -f kubernetes/nginx.yaml
```

4. **Deploy monitoring:**
```bash
kubectl apply -f kubernetes/monitoring.yaml
```

### Scaling
```bash
# Scale GUI application
kubectl scale deployment autodevai-gui --replicas=5 -n autodevai

# Scale sandbox manager
kubectl scale deployment sandbox-manager --replicas=3 -n autodevai
```

## ☁️ Cloud Deployment (AWS)

### Prerequisites
- AWS CLI configured
- Terraform installed
- Domain name registered

### Terraform Deployment

1. **Initialize Terraform:**
```bash
cd terraform
terraform init
```

2. **Plan deployment:**
```bash
terraform plan -var="environment=prod" -var="domain_name=autodev.ai"
```

3. **Apply infrastructure:**
```bash
terraform apply -var="environment=prod" -var="domain_name=autodev.ai"
```

4. **Configure kubectl:**
```bash
aws eks update-kubeconfig --region us-west-2 --name autodevai-cluster-prod
```

### AWS Resources Created
- **VPC** with public/private subnets
- **EKS Cluster** with managed node groups
- **RDS PostgreSQL** with read replicas
- **ElastiCache Redis** with replication
- **Application Load Balancer**
- **CloudFront CDN**
- **Route53 DNS**
- **S3 storage buckets**
- **ECR repositories**
- **ACM SSL certificates**

## 📊 Monitoring

### Grafana Dashboards
- **Application Metrics**: Request rates, error rates, response times
- **Infrastructure Metrics**: CPU, memory, disk usage
- **Database Metrics**: Connection counts, query performance
- **Sandbox Metrics**: Container lifecycle, resource usage

### Prometheus Metrics
- Custom application metrics
- Kubernetes cluster metrics
- Node-level system metrics
- Database and cache metrics

### Health Checks
- Application health endpoint: `/health`
- Database connectivity checks
- Redis connectivity checks
- Sandbox manager health

## 🛡️ Security

### Network Security
- Private subnets for databases
- Security groups with minimal access
- WAF protection (CloudFront)
- VPC flow logs

### Data Security
- Encryption at rest (RDS, ElastiCache, S3)
- Encryption in transit (TLS 1.2+)
- KMS key management
- Secrets management (AWS Secrets Manager/K8s Secrets)

### Access Control
- RBAC for Kubernetes
- IAM roles and policies
- JWT-based authentication
- API rate limiting

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: Deploy AutoDev-AI
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Deploy to production
      run: |
        cd infrastructure/scripts
        ./deploy.sh kubernetes prod autodev.ai
```

### Build and Push Images
```bash
# Build and push GUI image
docker build -f infrastructure/docker/Dockerfile.gui -t autodevai/gui:latest .
docker push autodevai/gui:latest

# Build and push sandbox manager
docker build -f infrastructure/docker/Dockerfile.sandbox -t autodevai/sandbox:latest .
docker push autodevai/sandbox:latest
```

## 🧪 Testing

### Local Testing
```bash
# Test Docker Compose deployment
cd infrastructure/docker
docker-compose up -d
curl http://localhost:50060/health

# Test services
curl http://localhost:50060/api/health
curl http://localhost:50090  # Grafana
```

### Load Testing
```bash
# Install k6 or use curl
curl -X POST http://localhost:50060/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"test-project"}'
```

## 📋 Maintenance

### Database Backups
```bash
# Docker Compose
docker-compose exec postgres pg_dump -U autodevai autodevai > backup.sql

# Kubernetes
kubectl exec -n autodevai postgres-0 -- pg_dump -U autodevai autodevai > backup.sql
```

### Updates
```bash
# Update Docker images
docker-compose pull
docker-compose up -d

# Update Kubernetes deployments
kubectl set image deployment/autodevai-gui autodevai-gui=autodevai/gui:v2.0.0 -n autodevai
```

### Scaling
```bash
# Docker Compose scaling
docker-compose up -d --scale autodevai-gui=3

# Kubernetes HPA
kubectl apply -f kubernetes/autodevai-gui.yaml  # HPA included
```

## 🆘 Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 50000-50089 are available
2. **Database connection**: Check DATABASE_URL and credentials
3. **SSL certificates**: Verify certificate paths and permissions
4. **Memory issues**: Increase resource limits in K8s manifests

### Debug Commands
```bash
# Docker Compose logs
docker-compose logs -f [service_name]

# Kubernetes logs
kubectl logs -f deployment/autodevai-gui -n autodevai
kubectl describe pod [pod_name] -n autodevai

# Terraform state
terraform show
terraform state list
```

### Health Check Endpoints
- Main app: `GET /health`
- Database: `GET /api/health/database`
- Redis: `GET /api/health/redis`
- Sandboxes: `GET /api/health/sandboxes`

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This infrastructure setup is part of the AutoDev-AI project. See the main project LICENSE file for details.