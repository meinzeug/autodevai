# 🛡️ Security Best Practices & Guidelines

**AutoDev-AI Security Framework** **Last Updated**: $(date '+%Y-%m-%d %H:%M:%S UTC') **Version**:
1.0 - Security-First Development

---

## 🎯 SECURITY-FIRST DEVELOPMENT PHILOSOPHY

### **Core Security Principles**

1. **Security by Design**: Security considerations integrated from project inception
2. **Zero Trust Architecture**: Never trust, always verify
3. **Defense in Depth**: Multiple layers of security controls
4. **Least Privilege Access**: Minimal necessary permissions
5. **Continuous Monitoring**: Real-time threat detection and response
6. **Security Automation**: Automated security scanning and remediation

### **Security-First Development Workflow**

```
Security Check → Development → Testing → Security Verification → Deployment
     ↑                                                               ↓
     ←←←←←←←←←←←←←← Continuous Security Monitoring ←←←←←←←←←←←←←←
```

---

## 🚨 CRITICAL SECURITY REQUIREMENTS

### **Mandatory Security Checks (Before ANY Development)**

#### 1. **GitHub Security Status Verification**

```bash
# MANDATORY pre-development security check
#!/bin/bash
security_gate_check() {
    echo "🔒 SECURITY GATE - Pre-development verification"

    # GitHub Security Alerts
    ALERTS=$(gh api repos/meinzeug/autodevai/code-scanning/alerts --jq '[.[] | select(.state=="open")] | length' 2>/dev/null || echo "ERROR")

    # Dependabot Status
    DEPENDABOT=$(gh api repos/meinzeug/autodevai/vulnerability-alerts --silent 2>/dev/null && echo "ENABLED" || echo "DISABLED")

    # Open Security Issues
    ISSUES=$(gh issue list --state=open --label="security" --json number | jq '. | length' 2>/dev/null || echo "0")

    # Security Gate Decision
    if [ "$ALERTS" -gt 0 ] || [ "$DEPENDABOT" = "DISABLED" ] || [ "$ISSUES" -gt 0 ]; then
        echo "🚨 SECURITY GATE: BLOCKED"
        echo "   - Security Alerts: $ALERTS"
        echo "   - Dependabot: $DEPENDABOT"
        echo "   - Security Issues: $ISSUES"
        echo "   - Action: RESOLVE SECURITY ISSUES BEFORE DEVELOPMENT"
        exit 1
    else
        echo "✅ SECURITY GATE: PASSED - Development authorized"
        exit 0
    fi
}

security_gate_check
```

#### 2. **Dependency Security Requirements**

```bash
# Run BEFORE any package installation
npm audit --audit-level moderate
if [ $? -ne 0 ]; then
    echo "🚨 DEPENDENCY SECURITY FAIL - Fix vulnerabilities first"
    exit 1
fi
```

#### 3. **Container Security Baseline**

```yaml
# MANDATORY for ALL Kubernetes pods
securityContext:
  allowPrivilegeEscalation: false
  runAsNonRoot: true
  runAsUser: 1000
  capabilities:
    drop:
      - ALL
  readOnlyRootFilesystem: true
```

---

## 🔒 GitHub Actions Security

### **Script Injection Prevention**

#### ❌ **DANGEROUS - Never Do This:**

```yaml
# VULNERABLE - Direct interpolation
- name: Dangerous example
  run: echo "Hello ${{ github.event.issue.title }}"

# VULNERABLE - Shell injection
- name: Another dangerous example
  run: |
    MESSAGE="${{ github.event.comment.body }}"
    echo $MESSAGE
```

#### ✅ **SECURE - Always Do This:**

```yaml
# SAFE - Environment variables
- name: Safe example
  env:
    ISSUE_TITLE: ${{ github.event.issue.title }}
  run: echo "Hello $ISSUE_TITLE"

# SAFE - Proper shell quoting
- name: Safe shell example
  env:
    COMMENT_BODY: ${{ github.event.comment.body }}
  run: |
    echo "$COMMENT_BODY"
```

### **Workflow Security Checklist**

- [ ] **No direct interpolation** of `${{ github.event.* }}`
- [ ] **Environment variables** used for all dynamic content
- [ ] **Input validation** for all workflow parameters
- [ ] **Minimal permissions** for workflow tokens
- [ ] **Secret scanning** enabled and monitored
- [ ] **Workflow approval** required for external contributors

---

## 🏗️ Infrastructure Security

### **AWS Security Requirements**

#### **EC2 Security Hardening**

```terraform
# EC2 Security Best Practices
resource "aws_instance" "secure_instance" {
  # REQUIRED: Disable IMDSv1 (metadata service v1)
  metadata_options {
    http_tokens = "required"  # Force IMDSv2
    http_endpoint = "enabled"
    http_put_response_hop_limit = 1
  }

  # REQUIRED: No public IP for private subnets
  associate_public_ip_address = false

  # REQUIRED: Encrypted storage
  root_block_device {
    encrypted = true
    kms_key_id = aws_kms_key.ebs_key.arn
  }
}
```

#### **VPC Security Configuration**

```terraform
# VPC Security Best Practices
resource "aws_subnet" "private_subnet" {
  # CRITICAL: Never allow public IP assignment for private subnets
  map_public_ip_on_launch = false

  # REQUIRED: Proper CIDR allocation
  cidr_block = "10.0.1.0/24"
}

resource "aws_security_group" "restrictive_sg" {
  # PRINCIPLE: Least privilege access
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]  # Internal only
  }

  # REQUIRED: No 0.0.0.0/0 for production
  # ingress {
  #   cidr_blocks = ["0.0.0.0/0"]  # NEVER DO THIS
  # }
}
```

#### **KMS Security Requirements**

```terraform
# KMS Security Best Practices
resource "aws_kms_key" "secure_key" {
  # REQUIRED: Enable key rotation
  enable_key_rotation = true

  # REQUIRED: Proper key policy
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" }
        Action = "kms:*"
        Resource = "*"
      }
    ]
  })
}
```

### **RDS Security Requirements**

```terraform
# RDS Security Best Practices
resource "aws_db_instance" "secure_db" {
  # REQUIRED: Encrypted storage
  storage_encrypted = true
  kms_key_id = aws_kms_key.rds_key.arn

  # REQUIRED: Enable logging
  enabled_cloudwatch_logs_exports = ["postgresql"]

  # REQUIRED: No public access
  publicly_accessible = false

  # REQUIRED: Backup and monitoring
  backup_retention_period = 30
  monitoring_interval = 60
}
```

---

## 🚢 Container Security

### **Docker Security Best Practices**

#### **Secure Dockerfile Template**

```dockerfile
# Use distroless or minimal base images
FROM gcr.io/distroless/nodejs18-debian11

# NEVER run as root
USER nonroot

# REQUIRED: Read-only file system
USER 65532:65532

# Copy only necessary files
COPY --chown=nonroot:nonroot package*.json ./
COPY --chown=nonroot:nonroot src/ ./src/

# SECURITY: No secrets in layers
# Use build-time secrets or multi-stage builds
```

#### **Container Runtime Security**

```bash
# SECURE: Run containers with security options
docker run \
  --read-only \
  --tmpfs /tmp \
  --tmpfs /var/tmp \
  --user 1000:1000 \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --security-opt seccomp:default \
  app:latest
```

### **Kubernetes Security Standards**

#### **Pod Security Template**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  # REQUIRED: Security context for pod
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    runAsGroup: 1000
    fsGroup: 1000
    seccompProfile:
      type: RuntimeDefault

  containers:
    - name: app
      image: app:latest
      # REQUIRED: Container security context
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        runAsNonRoot: true
        runAsUser: 1000
        capabilities:
          drop:
            - ALL

      # REQUIRED: Resource limits
      resources:
        limits:
          memory: '256Mi'
          cpu: '200m'
        requests:
          memory: '128Mi'
          cpu: '100m'

      # REQUIRED: Probes for health checking
      livenessProbe:
        httpGet:
          path: /health
          port: 8080
        initialDelaySeconds: 30
        periodSeconds: 10

      readinessProbe:
        httpGet:
          path: /ready
          port: 8080
        initialDelaySeconds: 5
        periodSeconds: 5
```

#### **Network Policy Template**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  # Default deny - explicit allow required
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-specific-traffic
spec:
  podSelector:
    matchLabels:
      app: myapp
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: allowed-app
      ports:
        - protocol: TCP
          port: 8080
```

---

## 🔍 Security Monitoring & Detection

### **Continuous Security Monitoring**

#### **Security Scanning Integration**

```yaml
# GitHub Actions Security Scanning
name: Security Scan
on: [push, pull_request]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Dependency scanning
      - name: NPM Audit
        run: npm audit --audit-level moderate

      # Container scanning
      - name: Container Scan
        uses: anchore/scan-action@v3
        with:
          image: 'app:latest'
          fail-build: true
          severity-cutoff: high

      # SAST scanning
      - name: SAST Scan
        uses: github/super-linter@v4
        env:
          DEFAULT_BRANCH: main
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          VALIDATE_ALL_CODEBASE: true
```

#### **Security Metrics Collection**

```bash
# Daily security metrics collection
#!/bin/bash
collect_security_metrics() {
    DATE=$(date +%Y-%m-%d)

    # GitHub Security Alerts
    ALERTS=$(gh api repos/meinzeug/autodevai/code-scanning/alerts --jq '[.[] | select(.state=="open")] | length')

    # Dependency vulnerabilities
    NPM_VULNS=$(npm audit --json | jq '.metadata.vulnerabilities | to_entries[] | select(.value > 0) | .value' | paste -sd+ | bc)

    # Infrastructure security score
    INFRA_SCORE=$(terraform-compliance -p infrastructure/terraform/ -f security/ --no-ansi | grep -c PASS)

    # Log metrics
    echo "$DATE,GitHub Alerts,$ALERTS" >> security-metrics.log
    echo "$DATE,NPM Vulnerabilities,$NPM_VULNS" >> security-metrics.log
    echo "$DATE,Infrastructure Score,$INFRA_SCORE" >> security-metrics.log
}
```

---

## 🚨 Incident Response Procedures

### **Security Incident Classification**

#### **P0 - Critical (Immediate Response)**

- Active security breach
- Critical vulnerability exploitation
- Data exfiltration detected
- Service compromise confirmed

**Response Time**: < 15 minutes **Actions**:

1. Isolate affected systems
2. Notify security team immediately
3. Preserve evidence
4. Begin containment procedures

#### **P1 - High (< 4 hours)**

- Newly discovered critical vulnerabilities
- Potential security bypass
- Suspicious activity detected
- Configuration drift detected

**Response Time**: < 4 hours **Actions**:

1. Assess threat severity
2. Plan remediation approach
3. Implement temporary mitigations
4. Schedule permanent fixes

#### **P2 - Medium (< 24 hours)**

- Non-critical vulnerabilities
- Security policy violations
- Compliance issues
- Routine security improvements

**Response Time**: < 24 hours **Actions**:

1. Document the issue
2. Plan remediation within SLA
3. Update security documentation
4. Schedule fixes in next sprint

### **Emergency Response Playbook**

#### **Step 1: Detection & Assessment**

```bash
# Immediate assessment script
security_incident_assess() {
    echo "🚨 SECURITY INCIDENT ASSESSMENT"
    echo "Time: $(date)"

    # Check for active threats
    gh api repos/meinzeug/autodevai/code-scanning/alerts --jq '[.[] | select(.state=="open" and .rule.severity=="error")]'

    # Check system status
    kubectl get pods --all-namespaces | grep -v Running

    # Check recent changes
    git log --oneline -10
}
```

#### **Step 2: Containment**

```bash
# Emergency containment procedures
emergency_containment() {
    echo "🔒 EMERGENCY CONTAINMENT ACTIVATED"

    # Disable vulnerable workflows
    find .github/workflows -name "*.yml" -exec mv {} {}.disabled \;

    # Scale down vulnerable deployments
    kubectl scale deployment --replicas=0 --all

    # Enable enhanced monitoring
    kubectl patch deployment monitoring --patch '{"spec":{"template":{"metadata":{"labels":{"security-enhanced":"true"}}}}}'
}
```

#### **Step 3: Recovery**

```bash
# Recovery procedures
security_recovery() {
    echo "🔄 SECURITY RECOVERY INITIATED"

    # Verify fixes applied
    security_gate_check || exit 1

    # Gradually restore services
    kubectl scale deployment app --replicas=1

    # Monitor for issues
    kubectl logs -f deployment/app
}
```

---

## 📋 Security Compliance Checklist

### **Pre-Deployment Security Checklist**

- [ ] **All security alerts resolved** (0 open alerts)
- [ ] **Dependabot enabled** and monitoring
- [ ] **Container images scanned** and vulnerabilities patched
- [ ] **Infrastructure security hardened** per standards
- [ ] **Network policies implemented** (zero-trust networking)
- [ ] **Secrets properly managed** (no hardcoded secrets)
- [ ] **HTTPS/TLS configured** everywhere
- [ ] **Security monitoring operational**
- [ ] **Backup and recovery tested**
- [ ] **Incident response plan reviewed**

### **Ongoing Security Requirements**

- [ ] **Daily security status review**
- [ ] **Weekly vulnerability scanning**
- [ ] **Monthly security assessment**
- [ ] **Quarterly penetration testing**
- [ ] **Annual security architecture review**
- [ ] **Continuous security training**
- [ ] **Security metrics tracking**
- [ ] **Compliance audits scheduled**

---

## 🎯 Security Training & Awareness

### **Secure Development Training Topics**

#### **For Developers**

1. **Secure Coding Practices**
   - Input validation and sanitization
   - Output encoding and escaping
   - Authentication and session management
   - Error handling and logging

2. **Container Security**
   - Secure image creation
   - Runtime security practices
   - Kubernetes security concepts
   - Supply chain security

3. **CI/CD Security**
   - Pipeline security hardening
   - Secret management in workflows
   - Dependency security scanning
   - Infrastructure as code security

#### **Security Knowledge Base**

- **OWASP Top 10** - Web application security risks
- **CWE Common Weaknesses** - Software security weaknesses
- **NIST Cybersecurity Framework** - Security standards and controls
- **Cloud Security Best Practices** - AWS/Azure/GCP security guidelines

---

## 📊 Security Metrics & KPIs

### **Security Health Metrics**

#### **Vulnerability Management**

```bash
# Weekly vulnerability metrics
security_metrics_report() {
    echo "📊 SECURITY METRICS REPORT - $(date +%Y-%m-%d)"
    echo "================================================"

    # Mean Time to Detection (MTTD)
    echo "🔍 Mean Time to Detection: $(calculate_mttd) hours"

    # Mean Time to Resolution (MTTR)
    echo "🔧 Mean Time to Resolution: $(calculate_mttr) hours"

    # Security Alert Trend
    echo "📈 Security Alert Trend: $(calculate_trend)"

    # Compliance Score
    echo "📋 Compliance Score: $(calculate_compliance_score)%"
}
```

#### **Target Security KPIs**

| Metric                       | Target     | Current | Status        |
| ---------------------------- | ---------- | ------- | ------------- |
| **Open Security Alerts**     | 0          | 30+     | 🔴 CRITICAL   |
| **Mean Time to Detection**   | < 4 hours  | TBD     | ⚡ TBD        |
| **Mean Time to Resolution**  | < 24 hours | TBD     | ⚡ TBD        |
| **Dependency Scan Coverage** | 100%       | 0%      | 🔴 CRITICAL   |
| **Container Security Score** | 95%+       | TBD     | ⚡ TBD        |
| **Infrastructure Hardening** | 100%       | 60%     | 🟠 NEEDS WORK |

---

## 🚀 Security Automation Framework

### **Automated Security Pipeline**

#### **Pre-commit Security Hooks**

```bash
#!/bin/bash
# .git/hooks/pre-commit
echo "🔒 Pre-commit security checks..."

# Scan for secrets
git-secrets --scan

# Lint security issues
eslint --config .eslintrc-security.js src/

# Check dependencies
npm audit --audit-level moderate

# Terraform security scan
terraform-compliance -p infrastructure/ -f security/

echo "✅ Pre-commit security checks passed"
```

#### **Automated Security Testing**

```yaml
# Security testing automation
name: Security Testing Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Dependency Check
        run: npm audit --audit-level high

      - name: SAST Scan
        uses: github/super-linter@v4
        env:
          VALIDATE_JAVASCRIPT_ES: true
          VALIDATE_TYPESCRIPT_ES: true

      - name: Container Security Scan
        run: |
          docker build -t test-image .
          trivy image --severity HIGH,CRITICAL test-image

      - name: Infrastructure Security Test
        run: |
          terraform init infrastructure/
          terraform plan -out=tfplan infrastructure/
          terraform-compliance -p tfplan -f security/
```

---

**🛡️ SECURITY IS EVERYONE'S RESPONSIBILITY**

**Remember**: Security is not a one-time activity but a continuous process that must be integrated
into every aspect of development and operations.

**Final Message**: 🚨 **ZERO-TOLERANCE FOR SECURITY ISSUES** - All security vulnerabilities must be
resolved before any development or deployment activities.

---

**Last Updated**: $(date '+%Y-%m-%d %H:%M:%S UTC') **Version**: 1.0 - Security-First Development
Framework **Status**: ACTIVE - Enforcing security-first development practices
