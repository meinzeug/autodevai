# Multi-stage build for AutoDev-AI Neural Bridge Platform
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl \
    wget \
    git \
    docker-cli \
    ca-certificates \
    tzdata

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    docker-cli \
    curl \
    wget \
    ca-certificates \
    tzdata \
    dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S autodev -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=build --chown=autodev:nodejs /app/dist ./dist
COPY --from=build --chown=autodev:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=autodev:nodejs /app/package.json ./package.json

# Copy necessary files
COPY --chown=autodev:nodejs src ./src
COPY --chown=autodev:nodejs scripts ./scripts
COPY --chown=autodev:nodejs deployment/docker/entrypoint.sh ./entrypoint.sh

# Create necessary directories
RUN mkdir -p /app/logs /app/temp /app/uploads /app/sandboxes
RUN chown -R autodev:nodejs /app

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

# Switch to non-root user
USER autodev

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["./entrypoint.sh"]