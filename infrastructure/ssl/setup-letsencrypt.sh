#!/bin/bash

# Let's Encrypt Setup Script for Production
# This script sets up cert-manager and Let's Encrypt certificates for Kubernetes

set -e

DOMAIN="${1:-autodev.ai}"
EMAIL="${2:-admin@autodev.ai}"
ENVIRONMENT="${3:-prod}"
NAMESPACE="autodevai"

echo "🔐 Setting up Let's Encrypt certificates for $DOMAIN"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is required but not installed. Please install kubectl first."
    exit 1
fi

# Check if helm is available
if ! command -v helm &> /dev/null; then
    echo "❌ Helm is required but not installed. Please install Helm first."
    exit 1
fi

# Add cert-manager Helm repository
echo "📦 Adding cert-manager Helm repository..."
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install cert-manager
echo "🚀 Installing cert-manager..."
kubectl create namespace cert-manager --dry-run=client -o yaml | kubectl apply -f -

helm upgrade --install cert-manager jetstack/cert-manager \
    --namespace cert-manager \
    --version v1.13.0 \
    --set installCRDs=true \
    --set global.leaderElection.namespace=cert-manager

# Wait for cert-manager to be ready
echo "⏳ Waiting for cert-manager to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/cert-manager -n cert-manager
kubectl wait --for=condition=available --timeout=300s deployment/cert-manager-webhook -n cert-manager
kubectl wait --for=condition=available --timeout=300s deployment/cert-manager-cainjector -n cert-manager

# Create ClusterIssuer for Let's Encrypt staging
echo "📋 Creating Let's Encrypt staging ClusterIssuer..."
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
  labels:
    app.kubernetes.io/name: cert-manager
    app.kubernetes.io/component: issuer
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: ${EMAIL}
    privateKeySecretRef:
      name: letsencrypt-staging
    solvers:
    - http01:
        ingress:
          class: nginx
    - dns01:
        route53:
          region: us-west-2
EOF

# Create ClusterIssuer for Let's Encrypt production
echo "📋 Creating Let's Encrypt production ClusterIssuer..."
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
  labels:
    app.kubernetes.io/name: cert-manager
    app.kubernetes.io/component: issuer
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ${EMAIL}
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
    - dns01:
        route53:
          region: us-west-2
EOF

# Create Certificate resource
echo "🎫 Creating Certificate resource..."
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: autodevai-tls
  namespace: ${NAMESPACE}
  labels:
    app.kubernetes.io/name: autodevai
    app.kubernetes.io/component: tls
spec:
  secretName: autodevai-tls
  issuerRef:
    name: letsencrypt-${ENVIRONMENT}
    kind: ClusterIssuer
  dnsNames:
  - ${DOMAIN}
  - www.${DOMAIN}
  - api.${DOMAIN}
  - grafana.${DOMAIN}
  - prometheus.${DOMAIN}
EOF

# Install nginx-ingress controller if not present
if ! kubectl get pods -n ingress-nginx | grep -q nginx-controller; then
    echo "🌐 Installing nginx-ingress controller..."
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo update
    
    helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
        --namespace ingress-nginx \
        --create-namespace \
        --set controller.service.type=LoadBalancer \
        --set controller.service.annotations."service\.beta\.kubernetes\.io/aws-load-balancer-type"="nlb" \
        --set controller.service.annotations."service\.beta\.kubernetes\.io/aws-load-balancer-cross-zone-load-balancing-enabled"="true"
fi

# Wait for certificate to be ready
echo "⏳ Waiting for certificate to be issued..."
echo "This may take a few minutes..."

# Check certificate status
timeout 300s bash -c '
while true; do
    STATUS=$(kubectl get certificate autodevai-tls -n '${NAMESPACE}' -o jsonpath="{.status.conditions[?(@.type==\"Ready\")].status}" 2>/dev/null || echo "Unknown")
    if [ "$STATUS" = "True" ]; then
        echo "✅ Certificate issued successfully!"
        break
    elif [ "$STATUS" = "False" ]; then
        echo "❌ Certificate issuance failed. Checking details..."
        kubectl describe certificate autodevai-tls -n '${NAMESPACE}'
        exit 1
    else
        echo "⏳ Certificate status: $STATUS (waiting...)"
        sleep 10
    fi
done
'

# Create enhanced ingress with SSL termination
echo "🚪 Creating enhanced ingress with SSL termination..."
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: autodevai-ingress-ssl
  namespace: ${NAMESPACE}
  labels:
    app.kubernetes.io/name: autodevai
    app.kubernetes.io/component: ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
    nginx.ingress.kubernetes.io/use-regex: "true"
    nginx.ingress.kubernetes.io/rewrite-target: /\$1
    cert-manager.io/cluster-issuer: letsencrypt-${ENVIRONMENT}
spec:
  tls:
  - hosts:
    - ${DOMAIN}
    - www.${DOMAIN}
    - api.${DOMAIN}
    - grafana.${DOMAIN}
    - prometheus.${DOMAIN}
    secretName: autodevai-tls
  rules:
  - host: ${DOMAIN}
    http:
      paths:
      - path: /(.*)
        pathType: Prefix
        backend:
          service:
            name: nginx-service
            port:
              number: 80
  - host: www.${DOMAIN}
    http:
      paths:
      - path: /(.*)
        pathType: Prefix
        backend:
          service:
            name: nginx-service
            port:
              number: 80
  - host: api.${DOMAIN}
    http:
      paths:
      - path: /(.*)
        pathType: Prefix
        backend:
          service:
            name: autodevai-gui-service
            port:
              number: 3000
  - host: grafana.${DOMAIN}
    http:
      paths:
      - path: /(.*)
        pathType: Prefix
        backend:
          service:
            name: grafana-service
            port:
              number: 3000
  - host: prometheus.${DOMAIN}
    http:
      paths:
      - path: /(.*)
        pathType: Prefix
        backend:
          service:
            name: prometheus-service
            port:
              number: 9090
EOF

# Create monitoring for certificates
echo "📊 Creating certificate monitoring..."
cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cert-manager-metrics
  namespace: cert-manager
  labels:
    app.kubernetes.io/name: cert-manager
    app.kubernetes.io/component: monitoring
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: cert-manager
  endpoints:
  - port: tcp-prometheus-servicemonitor
    interval: 30s
    path: /metrics
EOF

# Create certificate renewal cronjob
echo "🔄 Creating certificate renewal monitoring..."
cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cert-renewal-check
  namespace: ${NAMESPACE}
  labels:
    app.kubernetes.io/name: autodevai
    app.kubernetes.io/component: cert-renewal
spec:
  schedule: "0 2 * * 0"  # Weekly on Sunday at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: cert-check
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              echo "Checking certificate expiration..."
              kubectl get certificates -n ${NAMESPACE} -o wide
              kubectl describe certificate autodevai-tls -n ${NAMESPACE}
              
              # Check if certificate is about to expire (less than 30 days)
              EXPIRY=\$(kubectl get secret autodevai-tls -n ${NAMESPACE} -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -enddate | cut -d= -f2)
              EXPIRY_EPOCH=\$(date -d "\$EXPIRY" +%s)
              CURRENT_EPOCH=\$(date +%s)
              DAYS_LEFT=\$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))
              
              if [ \$DAYS_LEFT -lt 30 ]; then
                echo "⚠️ Certificate expires in \$DAYS_LEFT days!"
                # Trigger renewal by deleting the certificate secret
                kubectl delete secret autodevai-tls -n ${NAMESPACE} --ignore-not-found
                echo "Certificate secret deleted, cert-manager will renew automatically"
              else
                echo "✅ Certificate is valid for \$DAYS_LEFT more days"
              fi
            serviceAccountName: cert-renewal-sa
          restartPolicy: OnFailure
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cert-renewal-sa
  namespace: ${NAMESPACE}
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cert-renewal-role
  namespace: ${NAMESPACE}
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list", "delete"]
- apiGroups: ["cert-manager.io"]
  resources: ["certificates"]
  verbs: ["get", "list", "describe"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cert-renewal-binding
  namespace: ${NAMESPACE}
subjects:
- kind: ServiceAccount
  name: cert-renewal-sa
  namespace: ${NAMESPACE}
roleRef:
  kind: Role
  name: cert-renewal-role
  apiGroup: rbac.authorization.k8s.io
EOF

echo "✅ Let's Encrypt setup completed!"
echo ""
echo "📋 Summary:"
echo "  - cert-manager installed and configured"
echo "  - ClusterIssuers created for staging and production"
echo "  - Certificate resource created for $DOMAIN"
echo "  - nginx-ingress controller configured"
echo "  - SSL-enabled ingress created"
echo "  - Certificate monitoring and renewal setup"
echo ""
echo "🌐 Your applications will be available at:"
echo "  - Main app: https://$DOMAIN"
echo "  - API: https://api.$DOMAIN"
echo "  - Grafana: https://grafana.$DOMAIN"
echo "  - Prometheus: https://prometheus.$DOMAIN"
echo ""
echo "🔍 To check certificate status:"
echo "  kubectl get certificates -n $NAMESPACE"
echo "  kubectl describe certificate autodevai-tls -n $NAMESPACE"
echo ""
echo "📊 To view cert-manager logs:"
echo "  kubectl logs -n cert-manager deployment/cert-manager"