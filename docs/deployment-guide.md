# AutoDev-AI Neural Bridge - Production Deployment Guide

## Overview

This comprehensive guide covers the complete production deployment of the AutoDev-AI Neural Bridge
Platform, including containerization, orchestration, monitoring, security, and scaling strategies.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Security Configuration](#security-configuration)
4. [Container Deployment](#container-deployment)
5. [Kubernetes Orchestration](#kubernetes-orchestration)
6. [Monitoring & Observability](#monitoring--observability)
7. [Auto-Updates](#auto-updates)
8. [Telemetry & Analytics](#telemetry--analytics)
9. [Scaling Strategies](#scaling-strategies)
10. [Troubleshooting](#troubleshooting)
11. [Maintenance](#maintenance)

## Prerequisites

### System Requirements

**Minimum Production Environment:**

- **CPU**: 8 cores (16 vCPUs recommended)
- **Memory**: 16 GB RAM (32 GB recommended)
- **Storage**: 100 GB SSD (500 GB recommended)
- **Network**: 1 Gbps bandwidth
- **OS**: Ubuntu 22.04 LTS, CentOS 8+, or RHEL 8+

**Software Dependencies:**

- Docker 24.0+
- Kubernetes 1.28+
- kubectl 1.28+
- Helm 3.12+
- Node.js 18+
- Rust 1.70+
- Git 2.30+

### Access Requirements

- **Cloud Provider**: AWS, GCP, or Azure account with admin access
- **Domain**: Registered domain for production URLs
- **SSL Certificates**: Valid TLS certificates for HTTPS
- **Container Registry**: Access to container registry (Docker Hub, ghcr.io, ECR)

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/autodev-ai/neural-bridge.git
cd neural-bridge
```

### 2. Environment Variables

Create production environment configuration:

```bash
# Copy template
cp .env.example .env.production

# Edit with production values
nano .env.production
```

**Required Environment Variables:**

```bash
# Application
NODE_ENV=production
RUST_ENV=production
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:password@host:5432/autodev_ai
REDIS_URL=redis://host:6379

# AI Services
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx

# Security
JWT_SECRET=your-secure-jwt-secret
ENCRYPTION_KEY=your-32-byte-encryption-key

# Monitoring
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_URL=http://grafana:3000

# External Services
SLACK_WEBHOOK_URL=https://hooks.slack.com/xxx
NOTIFICATION_EMAIL=alerts@autodev-ai.com

# TLS/SSL
TLS_CERT_PATH=/etc/ssl/certs/autodev-ai.crt
TLS_KEY_PATH=/etc/ssl/private/autodev-ai.key
```

### 3. SSL Certificate Setup

**Using Let's Encrypt:**

```bash
# Install certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Generate certificates
sudo certbot certonly --standalone \
  -d app.autodev-ai.com \
  -d api.autodev-ai.com \
  -d sandbox.autodev-ai.com

# Copy certificates
sudo mkdir -p /etc/ssl/autodev-ai/
sudo cp /etc/letsencrypt/live/app.autodev-ai.com/fullchain.pem /etc/ssl/autodev-ai/tls.crt
sudo cp /etc/letsencrypt/live/app.autodev-ai.com/privkey.pem /etc/ssl/autodev-ai/tls.key
```

**Using Custom Certificates:**

```bash
# Create SSL directory
sudo mkdir -p /etc/ssl/autodev-ai/

# Copy your certificates
sudo cp your-certificate.crt /etc/ssl/autodev-ai/tls.crt
sudo cp your-private-key.key /etc/ssl/autodev-ai/tls.key

# Set proper permissions
sudo chmod 600 /etc/ssl/autodev-ai/tls.key
sudo chmod 644 /etc/ssl/autodev-ai/tls.crt
```

## Security Configuration

### 1. Secrets Management

**Create Kubernetes Secrets:**

```bash
# Database credentials
kubectl create secret generic autodev-ai-database \
  --from-literal=url="$DATABASE_URL" \
  --namespace=autodev-ai

# API keys
kubectl create secret generic autodev-ai-api-keys \
  --from-literal=openai="$OPENAI_API_KEY" \
  --from-literal=anthropic="$ANTHROPIC_API_KEY" \
  --namespace=autodev-ai

# TLS certificates
kubectl create secret tls autodev-ai-tls \
  --cert=/etc/ssl/autodev-ai/tls.crt \
  --key=/etc/ssl/autodev-ai/tls.key \
  --namespace=autodev-ai
```

### 2. Network Security

**Configure Firewall:**

```bash
# Allow HTTPS traffic
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp

# Allow SSH (change port as needed)
sudo ufw allow 22/tcp

# Allow Kubernetes API
sudo ufw allow 6443/tcp

# Enable firewall
sudo ufw enable
```

### 3. Code Signing Setup

**Generate Tauri Updater Keys:**

```bash
# Install Tauri CLI
cargo install tauri-cli

# Generate updater keypair
tauri signer generate -w ~/.tauri/autodev-ai.key

# Extract public key for updater configuration
tauri signer sign -k ~/.tauri/autodev-ai.key -f src-tauri/target/release/bundle/
```

## Container Deployment

### 1. Build Multi-Platform Images

```bash
# Setup Docker Buildx
docker buildx create --use --name autodev-ai-builder

# Build and push images
./scripts/deployment/build-images.sh
```

### 2. Docker Compose Deployment

For single-server deployment:

```bash
# Start all services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Verify services
docker-compose ps
docker-compose logs -f autodev-ai
```

### 3. Health Checks

```bash
# Check service health
curl -f http://localhost:50020/health  # GUI service
curl -f http://localhost:50021/health  # API service
curl -f http://localhost:50022/health  # Sandbox service
```

## Kubernetes Orchestration

### 1. Cluster Setup

**Using EKS (AWS):**

```bash
# Install eksctl
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin

# Create cluster
eksctl create cluster \
  --name autodev-ai-cluster \
  --version 1.28 \
  --region us-west-2 \
  --nodegroup-name autodev-ai-nodes \
  --node-type m5.xlarge \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 10 \
  --managed
```

**Using GKE (Google Cloud):**

```bash
# Create cluster
gcloud container clusters create autodev-ai-cluster \
  --machine-type n1-standard-4 \
  --num-nodes 3 \
  --enable-autoscaling \
  --min-nodes 2 \
  --max-nodes 10 \
  --zone us-central1-a
```

### 2. Deploy to Kubernetes

```bash
# Deploy using script
./scripts/deployment/deploy.sh

# Or manually apply manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/monitoring.yaml

# Verify deployment
kubectl get pods -n autodev-ai
kubectl rollout status deployment/autodev-ai-deployment -n autodev-ai
```

### 3. Configure Ingress

**Using NGINX Ingress Controller:**

```bash
# Install NGINX Ingress Controller
helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

# Install cert-manager for automatic SSL
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@autodev-ai.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

## Monitoring & Observability

### 1. Prometheus & Grafana Setup

```bash
# Install monitoring stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.retention=15d \
  --set grafana.adminPassword=secure-password-here
```

### 2. Application Metrics

The application exposes metrics at `/metrics` endpoint on port 8080:

- **System Metrics**: CPU, memory, disk usage
- **Application Metrics**: Request rates, response times, error rates
- **Business Metrics**: Active users, feature usage, AI model calls

### 3. Log Aggregation

**Using ELK Stack:**

```bash
# Deploy Elasticsearch
helm install elasticsearch elastic/elasticsearch \
  --namespace logging \
  --create-namespace

# Deploy Kibana
helm install kibana elastic/kibana \
  --namespace logging

# Deploy Filebeat for log collection
helm install filebeat elastic/filebeat \
  --namespace logging
```

### 4. Alerting Rules

Key alerts configured:

- Application down (5+ minutes)
- High CPU usage (>80% for 10+ minutes)
- High memory usage (>90% for 5+ minutes)
- High error rate (>5% for 5+ minutes)
- Slow response times (>2s 95th percentile for 10+ minutes)

## Auto-Updates

### 1. Configure Auto-Update System

```bash
# Initialize auto-update system
./scripts/deployment/auto-update.sh init

# Configure update settings
cat > update-config.json << 'EOF'
{
    "auto_update_enabled": true,
    "update_channel": "stable",
    "check_interval": 3600,
    "maintenance_window": {
        "enabled": true,
        "start_hour": 2,
        "end_hour": 4,
        "timezone": "UTC"
    },
    "rollback": {
        "enabled": true,
        "health_check_timeout": 300
    }
}
EOF
```

### 2. Setup Update Cron Job

```bash
# Add to crontab
crontab -e

# Add this line to check for updates every hour
0 * * * * /path/to/autodev-ai/scripts/deployment/auto-update.sh update
```

### 3. Manual Update Process

```bash
# Check for updates
./scripts/deployment/auto-update.sh check

# Perform manual update
./scripts/deployment/auto-update.sh update

# Rollback if needed
./scripts/deployment/auto-update.sh rollback
```

## Telemetry & Analytics

### 1. Setup Telemetry Infrastructure

```bash
# Initialize telemetry system
./scripts/deployment/telemetry.sh init

# Setup analytics infrastructure
./scripts/deployment/telemetry.sh setup

# Deploy telemetry services
./scripts/deployment/telemetry.sh deploy
```

### 2. Privacy Configuration

The system includes:

- **User Consent Management**: GDPR/CCPA compliant consent forms
- **Data Anonymization**: All PII removed or hashed
- **Retention Policies**: Automatic data deletion after configured periods
- **Opt-out Mechanisms**: Users can disable telemetry at any time

### 3. Analytics Dashboard

Access analytics at:

- **Analytics API**: `https://analytics.autodev-ai.com`
- **Metabase Dashboard**: `https://dashboard.autodev-ai.com`
- **Crash Reports**: `https://crashes.autodev-ai.com`

## Scaling Strategies

### 1. Horizontal Pod Autoscaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: autodev-ai-hpa
  namespace: autodev-ai
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: autodev-ai-deployment
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### 2. Cluster Autoscaling

**AWS EKS:**

```bash
# Install cluster autoscaler
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml

# Configure for your cluster
kubectl -n kube-system annotate deployment.apps/cluster-autoscaler cluster-autoscaler.kubernetes.io/safe-to-evict="false"
```

### 3. Load Testing

```bash
# Install k6 for load testing
sudo apt install k6

# Run load tests
k6 run scripts/performance/load-test.js
```

## Troubleshooting

### Common Issues

**1. Pods Stuck in Pending State:**

```bash
# Check node resources
kubectl describe nodes

# Check pod events
kubectl describe pod -n autodev-ai

# Check resource quotas
kubectl get resourcequota -n autodev-ai
```

**2. Service Not Accessible:**

```bash
# Check service endpoints
kubectl get endpoints -n autodev-ai

# Check ingress status
kubectl get ingress -n autodev-ai

# Test internal connectivity
kubectl run debug --image=busybox -it --rm -- wget -qO- http://autodev-ai-service:50021/health
```

**3. High Resource Usage:**

```bash
# Check resource consumption
kubectl top pods -n autodev-ai
kubectl top nodes

# Check for memory leaks
kubectl logs -n autodev-ai deployment/autodev-ai-deployment --tail=1000 | grep -i memory
```

### Debug Commands

```bash
# Get all resources in namespace
kubectl get all -n autodev-ai

# Describe deployment
kubectl describe deployment autodev-ai-deployment -n autodev-ai

# Get logs
kubectl logs -f deployment/autodev-ai-deployment -n autodev-ai

# Execute into pod
kubectl exec -it deployment/autodev-ai-deployment -n autodev-ai -- bash

# Port forward for debugging
kubectl port-forward service/autodev-ai-api-service 50021:50021 -n autodev-ai
```

## Maintenance

### 1. Regular Tasks

**Daily:**

- Monitor application logs for errors
- Check resource usage and scaling events
- Review security alerts and updates

**Weekly:**

- Update dependencies and security patches
- Review performance metrics and optimize
- Check backup integrity and test restores

**Monthly:**

- Security audit and vulnerability assessment
- Capacity planning and scaling review
- Update documentation and runbooks

### 2. Backup Strategy

**Application Data:**

```bash
# Database backup
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Configuration backup
kubectl get secrets -n autodev-ai -o yaml > secrets_backup.yaml
kubectl get configmaps -n autodev-ai -o yaml > configmaps_backup.yaml
```

**Disaster Recovery:**

```bash
# Create cluster snapshot (AWS EKS example)
aws ec2 create-snapshot --volume-id vol-xxxxx --description "AutoDev-AI backup $(date)"

# Backup to S3
aws s3 sync /path/to/backups/ s3://autodev-ai-backups/$(date +%Y/%m/%d)/
```

### 3. Update Procedures

**Application Updates:**

1. Test in staging environment
2. Schedule maintenance window
3. Create backup before update
4. Deploy using rolling update strategy
5. Verify health checks pass
6. Monitor for issues post-deployment

**Infrastructure Updates:**

1. Review change impact
2. Schedule maintenance window
3. Update one component at a time
4. Verify system stability
5. Update monitoring and alerting

## Performance Optimization

### 1. Application-Level Optimizations

- **Connection Pooling**: Configure database connection pools
- **Caching**: Implement Redis caching for frequent queries
- **CDN**: Use CloudFront or similar for static assets
- **Compression**: Enable gzip compression for API responses

### 2. Infrastructure Optimizations

- **Node Selection**: Use appropriate instance types for workloads
- **Network Optimization**: Configure VPC and security groups properly
- **Storage**: Use SSD storage for databases and high-IOPS workloads
- **Load Balancing**: Distribute traffic across multiple regions

### 3. Cost Optimization

- **Reserved Instances**: Use reserved instances for predictable workloads
- **Spot Instances**: Use spot instances for non-critical workloads
- **Auto-Scaling**: Configure appropriate scaling policies
- **Resource Limits**: Set proper resource requests and limits

## Security Best Practices

### 1. Network Security

- Use private subnets for application pods
- Implement network policies to restrict pod-to-pod communication
- Use service mesh for encrypted inter-service communication
- Regular security group and firewall audits

### 2. Container Security

- Use minimal base images (Alpine, Distroless)
- Scan container images for vulnerabilities
- Run containers as non-root users
- Implement pod security policies

### 3. Access Control

- Use RBAC for Kubernetes access control
- Implement least privilege principle
- Regular access reviews and cleanup
- Multi-factor authentication for admin access

## Support and Resources

### Documentation

- [API Documentation](./api-docs.md)
- [Configuration Reference](./configuration.md)
- [Security Guide](./security.md)
- [Troubleshooting Guide](./troubleshooting.md)

### Community

- **GitHub**: https://github.com/autodev-ai/neural-bridge
- **Discord**: https://discord.gg/autodev-ai
- **Documentation**: https://docs.autodev-ai.com

### Support Channels

- **Email**: support@autodev-ai.com
- **Emergency**: emergency@autodev-ai.com
- **Documentation**: docs@autodev-ai.com

---

**Last Updated**: $(date +%Y-%m-%d)  
**Version**: 2.0.0  
**Maintainer**: AutoDev-AI Team
