#!/bin/bash

# SSL Certificate Generation Script for AutoDev-AI
# This script generates self-signed certificates for development and provides instructions for production

set -e

DOMAIN="${1:-autodev.ai}"
CERT_DIR="$(dirname "$0")/certs"
DAYS=365

echo "🔐 Generating SSL certificates for $DOMAIN"

# Create certificates directory
mkdir -p "$CERT_DIR"

# Generate private key
echo "📄 Generating private key..."
openssl genrsa -out "$CERT_DIR/${DOMAIN}.key" 4096

# Create certificate signing request configuration
echo "📋 Creating certificate configuration..."
cat > "$CERT_DIR/${DOMAIN}.conf" <<EOF
[req]
default_bits = 4096
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=US
ST=California
L=San Francisco
O=AutoDev-AI
OU=Engineering
CN=${DOMAIN}

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${DOMAIN}
DNS.2 = *.${DOMAIN}
DNS.3 = localhost
DNS.4 = 127.0.0.1
DNS.5 = autodevai-gui
DNS.6 = autodevai-nginx
IP.1 = 127.0.0.1
IP.2 = 172.20.0.5
EOF

# Generate certificate signing request
echo "📝 Generating certificate signing request..."
openssl req -new -key "$CERT_DIR/${DOMAIN}.key" -out "$CERT_DIR/${DOMAIN}.csr" -config "$CERT_DIR/${DOMAIN}.conf"

# Generate self-signed certificate
echo "🔏 Generating self-signed certificate..."
openssl x509 -req -in "$CERT_DIR/${DOMAIN}.csr" -signkey "$CERT_DIR/${DOMAIN}.key" -out "$CERT_DIR/${DOMAIN}.crt" -days $DAYS -extensions v3_req -extfile "$CERT_DIR/${DOMAIN}.conf"

# Generate certificate for Docker Compose
cp "$CERT_DIR/${DOMAIN}.crt" "$CERT_DIR/autodev.ai.crt"
cp "$CERT_DIR/${DOMAIN}.key" "$CERT_DIR/autodev.ai.key"

# Create combined certificate file
cat "$CERT_DIR/${DOMAIN}.crt" "$CERT_DIR/${DOMAIN}.key" > "$CERT_DIR/${DOMAIN}.pem"

# Create DH parameters for enhanced security
echo "🛡️ Generating DH parameters (this may take a while)..."
openssl dhparam -out "$CERT_DIR/dhparam.pem" 2048

# Set proper permissions
chmod 600 "$CERT_DIR"/*.key
chmod 644 "$CERT_DIR"/*.crt
chmod 644 "$CERT_DIR"/*.pem

# Create CA certificate for development
echo "🏛️ Creating CA certificate for development..."
openssl genrsa -out "$CERT_DIR/ca.key" 4096

cat > "$CERT_DIR/ca.conf" <<EOF
[req]
default_bits = 4096
prompt = no
default_md = sha256
distinguished_name = dn

[dn]
C=US
ST=California
L=San Francisco
O=AutoDev-AI
OU=Certificate Authority
CN=AutoDev-AI Root CA
EOF

openssl req -new -x509 -key "$CERT_DIR/ca.key" -sha256 -days 3650 -out "$CERT_DIR/ca.crt" -config "$CERT_DIR/ca.conf"

# Create Kubernetes TLS secret manifest
echo "☸️ Creating Kubernetes TLS secret..."
kubectl create secret tls autodevai-tls \
  --cert="$CERT_DIR/${DOMAIN}.crt" \
  --key="$CERT_DIR/${DOMAIN}.key" \
  --dry-run=client -o yaml > "$CERT_DIR/tls-secret.yaml"

# Encode certificates for Kubernetes secrets
CERT_BASE64=$(base64 -w 0 "$CERT_DIR/${DOMAIN}.crt")
KEY_BASE64=$(base64 -w 0 "$CERT_DIR/${DOMAIN}.key")

cat > "$CERT_DIR/tls-secret-encoded.yaml" <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: autodevai-tls
  namespace: autodevai
  labels:
    app.kubernetes.io/name: autodevai
    app.kubernetes.io/component: tls
type: kubernetes.io/tls
data:
  tls.crt: ${CERT_BASE64}
  tls.key: ${KEY_BASE64}
EOF

echo "✅ SSL certificates generated successfully!"
echo ""
echo "📁 Certificate files:"
echo "  - Private key: $CERT_DIR/${DOMAIN}.key"
echo "  - Certificate: $CERT_DIR/${DOMAIN}.crt"
echo "  - CSR: $CERT_DIR/${DOMAIN}.csr"
echo "  - Combined PEM: $CERT_DIR/${DOMAIN}.pem"
echo "  - CA Certificate: $CERT_DIR/ca.crt"
echo "  - DH Parameters: $CERT_DIR/dhparam.pem"
echo "  - Kubernetes Secret: $CERT_DIR/tls-secret.yaml"
echo ""
echo "🔧 For Docker Compose:"
echo "  The certificates are automatically copied as autodev.ai.crt and autodev.ai.key"
echo ""
echo "☸️ For Kubernetes:"
echo "  Apply the TLS secret: kubectl apply -f $CERT_DIR/tls-secret.yaml"
echo ""
echo "🌐 For production, consider using:"
echo "  - Let's Encrypt with cert-manager (Kubernetes)"
echo "  - AWS Certificate Manager (ALB/CloudFront)"
echo "  - Custom CA-signed certificates"
echo ""
echo "⚠️ Note: These are self-signed certificates for development only!"
echo "   For production, use proper CA-signed certificates."

# Create nginx SSL configuration snippet
cat > "$CERT_DIR/ssl-params.conf" <<EOF
# SSL Configuration for Nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE+AESGCM:ECDHE+AES256:ECDHE+AES128:!aNULL:!MD5:!DSS;
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_dhparam /etc/nginx/certs/dhparam.pem;

# HSTS (optional)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
EOF

echo "📋 Nginx SSL configuration saved to: $CERT_DIR/ssl-params.conf"