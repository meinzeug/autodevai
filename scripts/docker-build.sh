#!/bin/bash
set -e
IMAGE_NAME="autodev-ai-builder"
TAG="${1:-latest}"
echo "Building Docker image: $IMAGE_NAME:$TAG"
cat > Dockerfile.build << 'DOCKERFILE'
FROM ubuntu:24.04
# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libwebkit2gtk-4.1-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"
# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs
WORKDIR /app
# Copy sources
COPY . .
# Build
RUN npm ci && \
    npm run build && \
    cd src-tauri && \
    cargo build --release
CMD ["echo", "Build complete"]
DOCKERFILE
docker build -f Dockerfile.build -t $IMAGE_NAME:$TAG .
echo "Docker build complete"
