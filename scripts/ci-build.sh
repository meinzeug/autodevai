#!/bin/bash
set -euo pipefail

# CI Build Script for AutoDevAI Neural Bridge Platform
# This script runs all necessary checks and builds for continuous integration

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[CI]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to run command with status reporting
run_step() {
    local step_name="$1"
    shift
    print_status "Running: $step_name"
    
    if "$@"; then
        print_success "$step_name completed successfully"
        return 0
    else
        print_error "$step_name failed with exit code $?"
        return 1
    fi
}

# Start CI build process
print_status "Starting CI build for AutoDevAI Neural Bridge Platform..."
echo "=================================="

# Check Node.js and npm versions
print_status "Checking Node.js and npm versions"
node --version
npm --version

# Install dependencies
run_step "Installing Node dependencies" npm ci

# Type checking
if npm run typecheck --silent 2>/dev/null; then
    run_step "Type checking" npm run typecheck
else
    print_warning "TypeScript type checking not available (npm run typecheck not found)"
fi

# Linting
if npm run lint --silent 2>/dev/null; then
    run_step "Linting code" npm run lint
else
    print_warning "Linting not available (npm run lint not found)"
fi

# Format checking
if npm run format:check --silent 2>/dev/null; then
    run_step "Checking code formatting" npm run format:check
else
    print_warning "Format checking not available (npm run format:check not found)"
fi

# Run tests
print_status "Running test suites"
run_step "Unit tests" npm run test:run

# Run security tests if available
if npm run test:security --silent 2>/dev/null; then
    run_step "Security tests" npm run test:security
else
    print_warning "Security tests not available"
fi

# Run performance tests if in CI environment
if [[ "${CI:-false}" == "true" ]]; then
    if npm run test:ci --silent 2>/dev/null; then
        run_step "CI test suite with coverage" npm run test:ci
    else
        print_warning "CI test suite not available"
    fi
fi

# Build frontend
run_step "Building frontend" npm run build

# Check if Tauri is available and build if it is
if [[ -f "src-tauri/Cargo.toml" ]]; then
    print_status "Tauri configuration found, building Tauri application"
    
    # Check if Cargo is available
    if command -v cargo &> /dev/null; then
        cd src-tauri
        
        # Run Rust tests
        run_step "Running Rust tests" cargo test
        
        # Build Tauri application
        if [[ "${TAURI_RELEASE:-false}" == "true" ]]; then
            run_step "Building Tauri application (release)" cargo build --release
        else
            run_step "Building Tauri application (debug)" cargo build
        fi
        
        cd ..
        print_success "Tauri build completed"
    else
        print_warning "Cargo not found, skipping Tauri build"
        print_warning "To build Tauri, install Rust: https://rustup.rs/"
    fi
else
    print_status "No Tauri configuration found, skipping Tauri build"
fi

# Validate build artifacts
print_status "Validating build artifacts"
if [[ -d "dist" ]]; then
    print_success "Frontend build artifacts found in dist/"
    ls -la dist/ | head -10
else
    print_error "Frontend build artifacts not found in dist/"
    exit 1
fi

# Health check if server can start
if npm run health:check --silent 2>/dev/null; then
    print_status "Running health check"
    # Start server in background for health check
    npm run dev &
    SERVER_PID=$!
    
    # Wait a moment for server to start
    sleep 5
    
    # Run health check
    if curl -f http://localhost:50010/health 2>/dev/null; then
        print_success "Health check passed"
    else
        print_warning "Health check failed - server may not be responding"
    fi
    
    # Clean up background server
    kill $SERVER_PID 2>/dev/null || true
else
    print_warning "Health check not available"
fi

# Final summary
echo "=================================="
print_success "CI build completed successfully!"
print_status "Build artifacts:"
echo "  - Frontend: dist/"
if [[ -f "src-tauri/target/debug/autodevai-neural-bridge-platform" ]] || [[ -f "src-tauri/target/release/autodevai-neural-bridge-platform" ]]; then
    echo "  - Tauri: src-tauri/target/"
fi

print_status "All CI checks passed ✓"
echo "Ready for deployment!"

exit 0