# Multi-stage Docker build for AutoDev-AI Neural Bridge Platform
# Optimized for CI/CD with security scanning and performance

# Build arguments
ARG BUILD_DATE
ARG GIT_COMMIT
ARG VERSION
ARG BUILD_TYPE=production
ARG NODE_ENV=production
ARG PORT=3000
ARG DISABLE_HEALTHCHECK=false

# Stage 1: Frontend Build
FROM node:18-alpine AS frontend-builder

# Set build environment
ENV NODE_ENV=${NODE_ENV}
ENV BUILD_TYPE=${BUILD_TYPE}

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    git

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Install dependencies with clean npm cache
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY public/ ./public/
COPY index.html ./

# Build frontend
RUN npm run build && \
    npm run typecheck

# Stage 2: Rust Build
FROM rust:1.75-alpine AS rust-builder

# Install system dependencies for Rust compilation
RUN apk add --no-cache \
    musl-dev \
    pkgconfig \
    openssl-dev \
    webkit2gtk-dev \
    gtk+3.0-dev \
    libayatana-appindicator3-dev \
    librsvg-dev

# Set working directory
WORKDIR /app

# Copy Cargo files
COPY src-tauri/Cargo.toml src-tauri/Cargo.lock ./src-tauri/

# Cache dependencies
RUN cd src-tauri && \
    mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src

# Copy source code
COPY src-tauri/src/ ./src-tauri/src/
COPY src-tauri/tauri.conf.json ./src-tauri/
COPY src-tauri/build.rs ./src-tauri/

# Copy frontend build from previous stage
COPY --from=frontend-builder /app/dist ./dist

# Build Rust application
RUN cd src-tauri && \
    cargo build --release && \
    strip target/release/autodev-ai

# Stage 3: Production Runtime
FROM alpine:3.18 AS runtime

# Security: Create non-root user
RUN addgroup -g 1001 -S autodev && \
    adduser -S autodev -u 1001 -G autodev

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    webkit2gtk \
    gtk+3.0 \
    libayatana-appindicator3 \
    librsvg \
    dbus \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=rust-builder /app/src-tauri/target/release/autodev-ai ./
COPY --from=frontend-builder /app/dist ./dist

# Copy configuration and scripts
COPY starthive.sh ./
COPY .claude-flow/ ./.claude-flow/

# Set permissions
RUN chmod +x ./autodev-ai ./starthive.sh && \
    chown -R autodev:autodev /app

# Create directories for runtime data
RUN mkdir -p /app/data /app/logs /app/cache && \
    chown -R autodev:autodev /app/data /app/logs /app/cache

# Switch to non-root user
USER autodev

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD ./autodev-ai --health-check || exit 1

# Expose ports (50000-50100 range as specified)
EXPOSE 50000 50001 50002 50003 50004 50005

# Environment variables
ENV RUST_LOG=info \
    AUTODEV_DATA_DIR=/app/data \
    AUTODEV_LOG_DIR=/app/logs \
    AUTODEV_CACHE_DIR=/app/cache \
    AUTODEV_PORT_RANGE=50000-50100

# Volume for persistent data
VOLUME ["/app/data", "/app/logs"]

# Default command
CMD ["./autodev-ai"]

# Labels for metadata
LABEL org.opencontainers.image.title="AutoDev-AI Neural Bridge Platform" \
      org.opencontainers.image.description="Multi-agent AI development platform with Claude-Flow orchestration" \
      org.opencontainers.image.vendor="AutoDev-AI" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.source="https://github.com/meinzeug/autodevai" \
      org.opencontainers.image.documentation="https://github.com/meinzeug/autodevai/blob/main/README.md" \
      org.opencontainers.image.version="1.0.0"