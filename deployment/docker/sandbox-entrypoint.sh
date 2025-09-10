#!/bin/bash
set -e

# AutoDev-AI Sandbox Manager Entrypoint Script

echo "📦 Starting AutoDev-AI Sandbox Manager..."

# Configure Docker daemon for sandbox isolation
echo "🔧 Configuring Docker for sandbox isolation..."

# Start Docker daemon if not running
if ! docker info >/dev/null 2>&1; then
  echo "🐳 Starting Docker daemon..."
  dockerd-entrypoint.sh dockerd --host=unix:///var/run/docker.sock &
  DOCKER_PID=$!
  
  # Wait for Docker to be ready
  while ! docker info >/dev/null 2>&1; do
    echo "Waiting for Docker daemon..."
    sleep 2
  done
  echo "✅ Docker daemon is ready"
fi

# Pull required sandbox images
echo "📥 Pulling sandbox images..."
SANDBOX_IMAGES=(
  "node:18-alpine"
  "python:3.11-alpine"
  "ubuntu:22.04"
  "nginx:alpine"
)

for image in "${SANDBOX_IMAGES[@]}"; do
  echo "Pulling $image..."
  docker pull "$image" || echo "⚠️ Failed to pull $image, continuing..."
done

# Create sandbox network
echo "🌐 Creating sandbox network..."
docker network create autodev-sandbox-network --driver bridge --subnet=172.21.0.0/16 || true

# Configure iptables rules for sandbox isolation
echo "🔒 Configuring security rules..."
iptables -A DOCKER-USER -i docker0 -o docker0 -j DROP || true
iptables -A DOCKER-USER -s 172.21.0.0/16 -d 172.20.0.0/16 -j DROP || true

# Initialize sandbox manager
echo "🚀 Initializing sandbox manager..."

# Graceful shutdown handler
shutdown_handler() {
  echo "🛑 Shutting down sandbox manager..."
  
  # Stop all running sandboxes
  echo "Stopping all sandboxes..."
  docker ps -q --filter "label=autodev.sandbox=true" | xargs -r docker stop
  docker ps -aq --filter "label=autodev.sandbox=true" | xargs -r docker rm
  
  # Stop Docker daemon if we started it
  if [ ! -z "$DOCKER_PID" ]; then
    kill -TERM $DOCKER_PID 2>/dev/null || true
    wait $DOCKER_PID 2>/dev/null || true
  fi
  
  echo "✅ Sandbox manager shutdown complete"
  exit 0
}

trap 'shutdown_handler' TERM INT

# Start the sandbox manager
echo "🎯 Starting sandbox manager service..."
node sandbox-manager.js &
MANAGER_PID=$!

# Wait for the process
wait $MANAGER_PID