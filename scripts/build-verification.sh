#!/bin/bash

# Build Verification Script for AutoDev-AI Neural Bridge Platform
# Comprehensive testing pipeline for TypeScript, ESLint, Rust, and npm tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
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

# Function to run command with timeout and capture output
run_with_timeout() {
    local timeout_duration=$1
    local description=$2
    shift 2
    
    print_status "Running: $description"
    
    if timeout "$timeout_duration" "$@" > "/tmp/build_verification_$$.log" 2>&1; then
        print_success "$description completed successfully"
        return 0
    else
        local exit_code=$?
        print_error "$description failed with exit code $exit_code"
        echo "Output:"
        cat "/tmp/build_verification_$$.log"
        rm -f "/tmp/build_verification_$$.log"
        return $exit_code
    fi
}

# Initialize results tracking
declare -A RESULTS
TOTAL_TESTS=0
PASSED_TESTS=0

# Test 1: TypeScript Compilation
print_status "=== Test 1: TypeScript Compilation ==="
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_with_timeout 120s "TypeScript compilation (npm run build)" npm run build; then
    RESULTS["typescript_build"]="PASSED"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    RESULTS["typescript_build"]="FAILED"
    print_error "TypeScript compilation failed - check for type errors"
fi

# Test 2: TypeScript Type Checking
print_status "=== Test 2: TypeScript Type Checking ==="
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_with_timeout 60s "TypeScript type checking (npm run typecheck)" npm run typecheck; then
    RESULTS["typescript_typecheck"]="PASSED"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    RESULTS["typescript_typecheck"]="FAILED"
    print_error "TypeScript type checking failed"
fi

# Test 3: ESLint Validation
print_status "=== Test 3: ESLint Validation ==="
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_with_timeout 60s "ESLint validation (npm run lint)" npm run lint; then
    RESULTS["eslint"]="PASSED"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    RESULTS["eslint"]="FAILED"
    print_warning "ESLint found errors/warnings - review code quality issues"
fi

# Test 4: Rust Compilation Check
print_status "=== Test 4: Rust Compilation Check ==="
TOTAL_TESTS=$((TOTAL_TESTS + 1))
cd src-tauri
if run_with_timeout 300s "Rust compilation check (cargo check)" cargo check; then
    RESULTS["rust_check"]="PASSED"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    RESULTS["rust_check"]="FAILED"
    print_error "Rust compilation check failed"
fi
cd ..

# Test 5: Rust Test Suite
print_status "=== Test 5: Rust Test Suite ==="
TOTAL_TESTS=$((TOTAL_TESTS + 1))
cd src-tauri
if run_with_timeout 300s "Rust test suite (cargo test)" cargo test; then
    RESULTS["rust_tests"]="PASSED"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    RESULTS["rust_tests"]="FAILED"
    print_error "Rust test suite failed"
fi
cd ..

# Test 6: npm Test Suite
print_status "=== Test 6: npm Test Suite ==="
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_with_timeout 120s "npm test suite (npm test)" npm run test:run; then
    RESULTS["npm_tests"]="PASSED"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    RESULTS["npm_tests"]="FAILED"
    print_warning "npm test suite has failing tests"
fi

# Test 7: Package Dependencies Check
print_status "=== Test 7: Package Dependencies Check ==="
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_with_timeout 30s "Package dependencies check (npm ls)" npm ls --depth=0; then
    RESULTS["dependencies"]="PASSED"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    RESULTS["dependencies"]="FAILED"
    print_warning "Package dependencies have issues"
fi

# Test 8: Tauri CLI Availability
print_status "=== Test 8: Tauri CLI Availability ==="
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if command -v tauri >/dev/null 2>&1; then
    RESULTS["tauri_cli"]="PASSED"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    print_success "Tauri CLI is available"
else
    RESULTS["tauri_cli"]="FAILED"
    print_warning "Tauri CLI not found - install with: cargo install tauri-cli"
fi

# Generate comprehensive report
print_status "=== Build Verification Summary ==="
echo ""
echo "Test Results:"
echo "=============="

for test in "${!RESULTS[@]}"; do
    result="${RESULTS[$test]}"
    if [[ "$result" == "PASSED" ]]; then
        echo -e "✅ $test: ${GREEN}$result${NC}"
    else
        echo -e "❌ $test: ${RED}$result${NC}"
    fi
done

echo ""
echo "Overall Results:"
echo "================"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$((TOTAL_TESTS - PASSED_TESTS))${NC}"
echo -e "Success Rate: ${GREEN}$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))%${NC}"

# Critical issues summary
echo ""
echo "Critical Issues Summary:"
echo "========================"

if [[ "${RESULTS[typescript_build]}" == "FAILED" ]]; then
    print_error "CRITICAL: TypeScript compilation failed - build will not work"
fi

if [[ "${RESULTS[rust_check]}" == "FAILED" ]]; then
    print_error "CRITICAL: Rust compilation failed - Tauri backend will not work"
fi

if [[ "${RESULTS[eslint]}" == "FAILED" ]]; then
    print_warning "WARNING: ESLint issues found - code quality needs attention"
fi

if [[ "${RESULTS[npm_tests]}" == "FAILED" ]]; then
    print_warning "WARNING: Test failures detected - functionality may be compromised"
fi

# Exit with appropriate status
if [[ "$PASSED_TESTS" -eq "$TOTAL_TESTS" ]]; then
    print_success "All build verification tests passed! 🎉"
    exit 0
elif [[ "${RESULTS[typescript_build]}" == "FAILED" || "${RESULTS[rust_check]}" == "FAILED" ]]; then
    print_error "Critical build failures detected - immediate attention required!"
    exit 1
else
    print_warning "Some tests failed but build should work - review warnings"
    exit 2
fi