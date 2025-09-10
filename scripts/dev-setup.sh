#!/bin/bash

# AutoDev-AI Development Environment Setup Script
# This script prepares the development environment for the next roadmap task

set -e

echo "🚀 Setting up AutoDev-AI Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Check Node.js version
print_header "Checking Prerequisites"
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    print_status "Node.js version: $NODE_VERSION"
else
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Rust installation
if command -v rustc >/dev/null 2>&1; then
    RUST_VERSION=$(rustc --version)
    print_status "Rust version: $RUST_VERSION"
else
    print_warning "Rust is not installed. Installing Rust for Tauri development..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source ~/.cargo/env
fi

# Install dependencies
print_header "Installing Dependencies"
print_status "Installing npm dependencies..."
npm install

# Setup Husky for git hooks
print_header "Setting up Git Hooks"
if [ -d ".git" ]; then
    print_status "Initializing Husky..."
    npx husky install
    npx husky add .husky/pre-commit "npm run pre-commit"
    npx husky add .husky/commit-msg "npx commitlint --edit \$1"
    chmod +x .husky/pre-commit .husky/commit-msg
else
    print_warning "Not a git repository. Skipping git hooks setup."
fi

# Create necessary directories
print_header "Creating Directory Structure"
mkdir -p {src/{components,services,hooks,types,utils,store},tests/{unit,integration,e2e},docs,config,scripts,dist,coverage}

# Setup environment files
print_header "Setting up Environment Configuration"
if [ ! -f ".env.local" ]; then
    cat > .env.local << EOF
# Development Environment Variables
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3001
VITE_APP_ENV=development
TAURI_DEBUG=true

# Feature Flags
VITE_ENABLE_DEVTOOLS=true
VITE_ENABLE_MOCKING=true
VITE_ENABLE_LOGGING=debug

# Service URLs
VITE_CLAUDE_FLOW_URL=http://localhost:3002
VITE_OPENAI_CODEX_URL=http://localhost:3003
VITE_NEURAL_BRIDGE_URL=http://localhost:3004
EOF
    print_status "Created .env.local with development configuration"
fi

if [ ! -f ".env.test" ]; then
    cat > .env.test << EOF
# Test Environment Variables
VITE_API_URL=http://localhost:3000
VITE_APP_ENV=test
NODE_ENV=test

# Test Database
DATABASE_URL=postgresql://test_user:test_password@localhost:5433/autodev_ai_test

# Disable external services in tests
VITE_ENABLE_EXTERNAL_APIS=false
EOF
    print_status "Created .env.test for testing environment"
fi

# Validate TypeScript configuration
print_header "Validating Configuration"
print_status "Checking TypeScript configuration..."
npm run typecheck

# Setup Docker development environment
print_header "Setting up Docker Development Environment"
if command -v docker >/dev/null 2>&1; then
    print_status "Docker found. Building development containers..."
    docker-compose -f config/docker-compose.dev.yml build --no-cache
else
    print_warning "Docker not found. Skipping container setup."
fi

# Run initial tests
print_header "Running Initial Validation"
print_status "Running linting..."
npm run lint

print_status "Running unit tests..."
npm run test -- --run --silent

print_header "Development Environment Ready!"
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Available commands:"
echo "  npm run dev          - Start development server"
echo "  npm run tauri:dev    - Start Tauri development mode"
echo "  npm run test         - Run tests with watch mode"
echo "  npm run test:ui      - Run tests with UI"
echo "  npm run lint         - Run ESLint"
echo "  npm run format       - Format code with Prettier"
echo "  npm run typecheck    - Run TypeScript checks"
echo "  npm run docker:dev   - Start Docker development environment"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the project structure in src/"
echo "2. Check the configuration files in config/"
echo "3. Start development with: npm run dev"
echo "4. Begin implementing the next roadmap task"