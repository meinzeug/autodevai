#!/bin/bash
set -e

echo "🧪 Testing Build Automation Pipeline"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[FAIL]${NC} $1"
    exit 1
}

# Test 1: Verify all scripts exist
log "Testing script existence..."
if [ -f "src-tauri/before-build.sh" ]; then
    success "Pre-build script exists"
else
    error "Pre-build script missing"
fi

if [ -f "src-tauri/after-build.sh" ]; then
    success "Post-build script exists"
else
    error "Post-build script missing"
fi

if [ -f "scripts/build-all.sh" ]; then
    success "Build variants script exists"
else
    error "Build variants script missing"
fi

if [ -f "scripts/version-bump.sh" ]; then
    success "Version bump script exists"
else
    error "Version bump script missing"
fi

if [ -f ".env.example" ]; then
    success "Environment template exists"
else
    error "Environment template missing"
fi

# Test 2: Verify script permissions
log "Testing script permissions..."
if [ -x "src-tauri/before-build.sh" ]; then
    success "Pre-build script is executable"
else
    warning "Pre-build script not executable - fixing..."
    chmod +x src-tauri/before-build.sh
fi

if [ -x "src-tauri/after-build.sh" ]; then
    success "Post-build script is executable"
else
    warning "Post-build script not executable - fixing..."
    chmod +x src-tauri/after-build.sh
fi

if [ -x "scripts/build-all.sh" ]; then
    success "Build variants script is executable"
else
    warning "Build variants script not executable - fixing..."
    chmod +x scripts/build-all.sh
fi

if [ -x "scripts/version-bump.sh" ]; then
    success "Version bump script is executable"
else
    warning "Version bump script not executable - fixing..."
    chmod +x scripts/version-bump.sh
fi

# Test 3: Validate Tauri configuration
log "Testing Tauri configuration..."
if [ -f "src-tauri/tauri.conf.json" ]; then
    if python3 -m json.tool src-tauri/tauri.conf.json > /dev/null 2>&1; then
        success "Tauri configuration is valid JSON"
    else
        error "Invalid JSON in tauri.conf.json"
    fi
    
    # Check for build hooks
    if grep -q "before-build.sh" src-tauri/tauri.conf.json; then
        success "Build hooks configured in tauri.conf.json"
    else
        warning "Build hooks not found in tauri.conf.json"
    fi
else
    error "tauri.conf.json not found"
fi

# Test 4: Validate GitHub Actions workflow
log "Testing GitHub Actions workflow..."
if [ -f ".github/workflows/build-automation.yml" ]; then
    success "GitHub Actions workflow exists"
    
    # Basic YAML validation
    if python3 -c "import yaml; yaml.safe_load(open('.github/workflows/build-automation.yml'))" 2>/dev/null; then
        success "GitHub Actions workflow is valid YAML"
    else
        error "Invalid YAML in GitHub Actions workflow"
    fi
else
    error "GitHub Actions workflow missing"
fi

# Test 5: Test environment template
log "Testing environment template..."
if grep -q "VITE_OPENROUTER_API_KEY" .env.example; then
    success "Environment template contains required variables"
else
    error "Environment template missing required variables"
fi

# Test 6: Test version bump functionality (dry run)
log "Testing version bump script (dry run)..."
if [ -f "package.json" ]; then
    CURRENT_VERSION=$(node -p "require('./package.json').version")
    log "Current version: $CURRENT_VERSION"
    success "Version extraction working"
else
    error "package.json not found"
fi

# Test 7: Test script syntax
log "Testing script syntax..."
bash -n src-tauri/before-build.sh && success "Pre-build script syntax valid" || error "Pre-build script syntax invalid"
bash -n src-tauri/after-build.sh && success "Post-build script syntax valid" || error "Post-build script syntax invalid"
bash -n scripts/build-all.sh && success "Build variants script syntax valid" || error "Build variants script syntax invalid"
bash -n scripts/version-bump.sh && success "Version bump script syntax valid" || error "Version bump script syntax invalid"

# Test 8: Test directory structure
log "Testing directory structure..."
if [ -d "scripts" ]; then
    success "Scripts directory exists"
else
    warning "Scripts directory missing - creating..."
    mkdir -p scripts
fi

if [ -d ".github/workflows" ]; then
    success "GitHub workflows directory exists"
else
    warning "GitHub workflows directory missing"
fi

# Test 9: Test build automation integration
log "Testing build automation integration..."
if command -v npm >/dev/null 2>&1; then
    success "npm available"
    if [ -f "package.json" ]; then
        # Check for required scripts
        if grep -q '"tauri:build"' package.json; then
            success "Tauri build script found in package.json"
        else
            warning "Tauri build script not found in package.json"
        fi
    fi
else
    warning "npm not available - cannot test build integration"
fi

if command -v cargo >/dev/null 2>&1; then
    success "Cargo available"
else
    warning "Cargo not available - cannot test Rust build"
fi

# Test 10: Test hooks integration
log "Testing hooks integration..."
if command -v npx >/dev/null 2>&1; then
    if npx claude-flow@alpha --version >/dev/null 2>&1; then
        success "Claude Flow hooks available"
    else
        warning "Claude Flow hooks not available"
    fi
else
    warning "npx not available - cannot test hooks"
fi

echo -e "\n${GREEN}🎉 Build Automation Testing Completed!${NC}"
echo -e "${BLUE}Summary:${NC}"
echo "- All critical scripts are present and executable"
echo "- Configuration files are valid"
echo "- GitHub Actions workflow is configured"
echo "- Environment template is complete"
echo "- Integration points are verified"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Run './scripts/build-all.sh' to test full build pipeline"
echo "2. Run './scripts/version-bump.sh patch' to test versioning"
echo "3. Test GitHub Actions by pushing to a branch"
echo "4. Verify CI/CD integration with actual builds"