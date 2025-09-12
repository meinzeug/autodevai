#!/bin/bash
# AutoDev-AI Secure Monitoring SSL Certificate Generation Script
# This script generates self-signed SSL certificates for all monitoring services

set -euo pipefail

# Configuration
CERT_DIR="./ssl"
DAYS=365
COUNTRY="US"
STATE="AutoDev-AI"
CITY="AutoDev-AI"
ORG="AutoDev-AI Security"
OU="Monitoring"
CN="monitoring.autodev-ai.local"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}AutoDev-AI Monitoring SSL Certificate Generator${NC}"
echo -e "${BLUE}================================================${NC}"

# Create certificate directories
echo -e "${YELLOW}Creating SSL certificate directories...${NC}"
mkdir -p ${CERT_DIR}/{ca,prometheus,grafana,alertmanager,loki,kibana,elasticsearch,postgres,nginx}

# Generate CA private key
echo -e "${YELLOW}Generating Certificate Authority (CA)...${NC}"
openssl genrsa -out ${CERT_DIR}/ca/ca-key.pem 4096

# Generate CA certificate
openssl req -new -x509 -days ${DAYS} -key ${CERT_DIR}/ca/ca-key.pem \
    -out ${CERT_DIR}/ca/ca.pem \
    -subj "/C=${COUNTRY}/ST=${STATE}/L=${CITY}/O=${ORG}/OU=${OU}/CN=AutoDev-AI-CA"

echo -e "${GREEN}CA certificate generated successfully${NC}"

# Function to generate service certificates
generate_service_cert() {
    local service=$1
    local alt_names=$2
    
    echo -e "${YELLOW}Generating SSL certificate for ${service}...${NC}"
    
    # Generate private key
    openssl genrsa -out ${CERT_DIR}/${service}/key.pem 2048
    
    # Create certificate request
    openssl req -new -key ${CERT_DIR}/${service}/key.pem \
        -out ${CERT_DIR}/${service}/cert.csr \
        -subj "/C=${COUNTRY}/ST=${STATE}/L=${CITY}/O=${ORG}/OU=${OU}/CN=${CN}"
    
    # Create certificate extensions file
    cat > ${CERT_DIR}/${service}/cert.ext <<EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
${alt_names}
EOF
    
    # Sign the certificate
    openssl x509 -req -in ${CERT_DIR}/${service}/cert.csr \
        -CA ${CERT_DIR}/ca/ca.pem \
        -CAkey ${CERT_DIR}/ca/ca-key.pem \
        -CAcreateserial \
        -out ${CERT_DIR}/${service}/cert.pem \
        -days ${DAYS} \
        -extensions v3_req \
        -extfile ${CERT_DIR}/${service}/cert.ext
    
    # Copy CA certificate for services that need it
    cp ${CERT_DIR}/ca/ca.pem ${CERT_DIR}/${service}/ca.crt
    
    # Create combined certificate file
    cat ${CERT_DIR}/${service}/cert.pem ${CERT_DIR}/ca/ca.pem > ${CERT_DIR}/${service}/fullchain.pem
    
    # Set proper permissions
    chmod 600 ${CERT_DIR}/${service}/key.pem
    chmod 644 ${CERT_DIR}/${service}/cert.pem
    
    # Clean up
    rm ${CERT_DIR}/${service}/cert.csr ${CERT_DIR}/${service}/cert.ext
    
    echo -e "${GREEN}✓ SSL certificate for ${service} generated${NC}"
}

# Generate certificates for each service
generate_service_cert "prometheus" "DNS:prometheus,DNS:monitoring.autodev-ai.local,DNS:localhost,IP:127.0.0.1,IP:172.30.0.10"
generate_service_cert "grafana" "DNS:grafana,DNS:monitoring.autodev-ai.local,DNS:localhost,IP:127.0.0.1,IP:172.30.0.11"
generate_service_cert "alertmanager" "DNS:alertmanager,DNS:monitoring.autodev-ai.local,DNS:localhost,IP:127.0.0.1,IP:172.30.0.12"
generate_service_cert "loki" "DNS:loki,DNS:monitoring.autodev-ai.local,DNS:localhost,IP:127.0.0.1,IP:172.30.0.13"
generate_service_cert "kibana" "DNS:kibana,DNS:monitoring.autodev-ai.local,DNS:localhost,IP:127.0.0.1,IP:172.30.0.14"
generate_service_cert "nginx" "DNS:monitoring.autodev-ai.local,DNS:localhost,DNS:*.autodev-ai.local,IP:127.0.0.1"

# Generate Elasticsearch certificates (special format)
echo -e "${YELLOW}Generating Elasticsearch SSL certificates...${NC}"
mkdir -p ${CERT_DIR}/elasticsearch

# Generate Elasticsearch transport certificate
openssl req -new -x509 -days ${DAYS} -nodes \
    -out ${CERT_DIR}/elasticsearch/transport.crt \
    -keyout ${CERT_DIR}/elasticsearch/transport.key \
    -subj "/C=${COUNTRY}/ST=${STATE}/L=${CITY}/O=${ORG}/OU=${OU}/CN=elasticsearch-transport"

# Generate Elasticsearch HTTP certificate
openssl req -new -x509 -days ${DAYS} -nodes \
    -out ${CERT_DIR}/elasticsearch/http.crt \
    -keyout ${CERT_DIR}/elasticsearch/http.key \
    -subj "/C=${COUNTRY}/ST=${STATE}/L=${CITY}/O=${ORG}/OU=${OU}/CN=elasticsearch"

# Create PKCS12 keystores for Elasticsearch
openssl pkcs12 -export -in ${CERT_DIR}/elasticsearch/transport.crt \
    -inkey ${CERT_DIR}/elasticsearch/transport.key \
    -out ${CERT_DIR}/elasticsearch/transport.p12 \
    -name "transport" -passout pass:changeme

openssl pkcs12 -export -in ${CERT_DIR}/elasticsearch/http.crt \
    -inkey ${CERT_DIR}/elasticsearch/http.key \
    -out ${CERT_DIR}/elasticsearch/http.p12 \
    -name "http" -passout pass:changeme

# Copy CA for Elasticsearch
cp ${CERT_DIR}/ca/ca.pem ${CERT_DIR}/elasticsearch/ca.crt

echo -e "${GREEN}✓ Elasticsearch SSL certificates generated${NC}"

# Generate PostgreSQL certificates
echo -e "${YELLOW}Generating PostgreSQL SSL certificates...${NC}"
generate_service_cert "postgres" "DNS:postgres,DNS:localhost,IP:127.0.0.1,IP:172.30.0.15"

# Create server certificate files with proper names for PostgreSQL
cp ${CERT_DIR}/postgres/cert.pem ${CERT_DIR}/postgres/server.crt
cp ${CERT_DIR}/postgres/key.pem ${CERT_DIR}/postgres/server.key
cp ${CERT_DIR}/ca/ca.pem ${CERT_DIR}/postgres/ca.crt

echo -e "${GREEN}✓ PostgreSQL SSL certificates generated${NC}"

# Set proper ownership and permissions
echo -e "${YELLOW}Setting certificate permissions...${NC}"
find ${CERT_DIR} -type f -name "*.key" -o -name "*.pem" | xargs chmod 600
find ${CERT_DIR} -type f -name "*.crt" -o -name "*.cert" | xargs chmod 644
find ${CERT_DIR} -type d | xargs chmod 755

# Generate certificate verification script
cat > ${CERT_DIR}/verify-certs.sh <<'EOF'
#!/bin/bash
# Certificate verification script

echo "Verifying SSL certificates..."

for service in prometheus grafana alertmanager loki kibana postgres nginx; do
    if [[ -f ssl/${service}/cert.pem ]]; then
        echo "Checking ${service} certificate..."
        openssl x509 -in ssl/${service}/cert.pem -text -noout | grep -E "(Subject:|Not After:|DNS:|IP Address:)"
        echo "---"
    fi
done

echo "Checking CA certificate..."
openssl x509 -in ssl/ca/ca.pem -text -noout | grep -E "(Subject:|Not After:)"
EOF

chmod +x ${CERT_DIR}/verify-certs.sh

# Create certificate renewal script
cat > ${CERT_DIR}/renew-certs.sh <<'EOF'
#!/bin/bash
# Certificate renewal script (run monthly)

echo "Checking certificate expiration..."

for cert_file in $(find ssl/ -name "*.pem" -o -name "*.crt"); do
    if openssl x509 -checkend 2592000 -noout -in "$cert_file" >/dev/null 2>&1; then
        echo "✓ $cert_file is valid for at least 30 days"
    else
        echo "⚠ WARNING: $cert_file expires within 30 days!"
        openssl x509 -enddate -noout -in "$cert_file"
    fi
done

echo "For certificate renewal, regenerate using: ./generate-ssl-certs.sh"
EOF

chmod +x ${CERT_DIR}/renew-certs.sh

# Create Docker volume creation script
cat > create-ssl-volumes.sh <<'EOF'
#!/bin/bash
# Create Docker volumes for SSL certificates

echo "Creating SSL certificate Docker volumes..."

docker volume create autodev-ai-ssl-ca
docker volume create autodev-ai-ssl-prometheus
docker volume create autodev-ai-ssl-grafana
docker volume create autodev-ai-ssl-alertmanager
docker volume create autodev-ai-ssl-loki
docker volume create autodev-ai-ssl-kibana
docker volume create autodev-ai-ssl-elasticsearch
docker volume create autodev-ai-ssl-postgres
docker volume create autodev-ai-ssl-nginx

echo "SSL volumes created successfully!"
EOF

chmod +x create-ssl-volumes.sh

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}SSL Certificate Generation Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "1. Copy ${YELLOW}monitoring/.env.secure.template${NC} to ${YELLOW}monitoring/.env.secure${NC}"
echo -e "2. Fill in your secure passwords in ${YELLOW}.env.secure${NC}"
echo -e "3. Run: ${YELLOW}./create-ssl-volumes.sh${NC} (if using Docker volumes)"
echo -e "4. Deploy with: ${YELLOW}docker-compose -f docker-compose.secure.yml up -d${NC}"
echo -e "5. Verify certificates: ${YELLOW}cd ssl && ./verify-certs.sh${NC}"
echo ""
echo -e "${YELLOW}Security reminders:${NC}"
echo -e "• ${RED}Never commit .env.secure to version control${NC}"
echo -e "• ${RED}Store certificate passwords securely${NC}"
echo -e "• ${GREEN}Schedule monthly certificate checks${NC}"
echo -e "• ${GREEN}Enable TLS verification in all clients${NC}"
echo ""
echo -e "${BLUE}Certificate locations:${NC}"
echo -e "CA Certificate: ${YELLOW}${CERT_DIR}/ca/ca.pem${NC}"
echo -e "Service certificates: ${YELLOW}${CERT_DIR}/[service]/cert.pem${NC}"
echo -e "Private keys: ${YELLOW}${CERT_DIR}/[service]/key.pem${NC}"