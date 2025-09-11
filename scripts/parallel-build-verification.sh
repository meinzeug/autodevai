#!/bin/bash

# Parallel Build Verification Script for AutoDev-AI Neural Bridge Platform
# Runs multiple build verification tests in parallel for faster execution

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status with timestamp
print_status() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')]${NC} $1"
}

print_error() {
    echo -e "${RED}[$(date '+%H:%M:%S')]${NC} $1"
}

# Create temporary directory for test outputs
TEST_OUTPUT_DIR="/tmp/build_verification_$$"
mkdir -p "$TEST_OUTPUT_DIR"

# Function to run test in background
run_test_async() {
    local test_name=$1
    local timeout_duration=$2
    local description=$3
    shift 3
    
    local output_file="$TEST_OUTPUT_DIR/${test_name}.log"
    local status_file="$TEST_OUTPUT_DIR/${test_name}.status"
    
    print_status "Starting: $description"
    
    {
        if timeout "$timeout_duration" "$@" > "$output_file" 2>&1; then
            echo "PASSED" > "$status_file"
        else
            echo "FAILED" > "$status_file"
        fi
    } &
    
    local pid=$!
    echo "$pid" > "$TEST_OUTPUT_DIR/${test_name}.pid"
    
    return 0
}

# Function to wait for test and get result
wait_for_test() {
    local test_name=$1
    local description=$2
    
    local pid_file="$TEST_OUTPUT_DIR/${test_name}.pid"
    local status_file="$TEST_OUTPUT_DIR/${test_name}.status"
    local output_file="$TEST_OUTPUT_DIR/${test_name}.log"
    
    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        wait "$pid" 2>/dev/null || true
    fi
    
    if [[ -f "$status_file" ]]; then
        local status=$(cat "$status_file")
        if [[ "$status" == "PASSED" ]]; then
            print_success "$description: PASSED"
            return 0
        else
            print_error "$description: FAILED"
            if [[ -f "$output_file" ]]; then
                echo "--- Output for $description ---"
                tail -20 "$output_file"
                echo "--- End Output ---"
            fi
            return 1
        fi
    else
        print_error "$description: NO STATUS (likely timed out)"
        return 1
    fi
}

print_status "=== Starting Parallel Build Verification ==="
START_TIME=$(date +%s)

# Start all tests in parallel
print_status "Phase 1: Starting TypeScript and ESLint tests..."
run_test_async "typescript_build" "120s" "TypeScript Compilation" npm run build
run_test_async "typescript_typecheck" "60s" "TypeScript Type Checking" npm run typecheck
run_test_async "eslint_check" "60s" "ESLint Validation" npm run lint

print_status "Phase 2: Starting Rust tests..."
run_test_async "rust_check" "300s" "Rust Compilation Check" bash -c "cd src-tauri && cargo check"
run_test_async "rust_test" "300s" "Rust Test Suite" bash -c "cd src-tauri && cargo test --lib --bins"

print_status "Phase 3: Starting npm and dependency tests..."
run_test_async "npm_test" "120s" "npm Test Suite" npm run test:run
run_test_async "dependencies_check" "30s" "Package Dependencies Check" npm ls --depth=0

# Quick synchronous tests
print_status "Phase 4: Running quick checks..."
TAURI_CLI_STATUS="FAILED"
if command -v tauri >/dev/null 2>&1; then
    TAURI_CLI_STATUS="PASSED"
    print_success "Tauri CLI: AVAILABLE"
else
    print_warning "Tauri CLI: NOT FOUND"
fi

NODE_VERSION_STATUS="FAILED"
if node --version | grep -q "v1[89]\|v2[0-9]"; then
    NODE_VERSION_STATUS="PASSED"
    print_success "Node.js Version: $(node --version)"
else
    print_warning "Node.js Version: $(node --version) - may need v18+"
fi

# Wait for all parallel tests to complete
print_status "=== Waiting for test completion ==="

declare -A RESULTS
TOTAL_TESTS=0
PASSED_TESTS=0

# Wait for TypeScript and ESLint tests
print_status "Waiting for TypeScript and ESLint tests..."
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if wait_for_test "typescript_build" "TypeScript Compilation"; then
    RESULTS["typescript_build"]="PASSED"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    RESULTS["typescript_build"]="FAILED"
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if wait_for_test "typescript_typecheck" "TypeScript Type Checking"; then
    RESULTS["typescript_typecheck"]="PASSED"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    RESULTS["typescript_typecheck"]="FAILED"
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if wait_for_test "eslint_check" "ESLint Validation"; then
    RESULTS["eslint_check"]="PASSED"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    RESULTS["eslint_check"]="FAILED"
fi

# Wait for Rust tests
print_status "Waiting for Rust tests..."
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if wait_for_test "rust_check" "Rust Compilation Check"; then
    RESULTS["rust_check"]="PASSED"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    RESULTS["rust_check"]="FAILED"
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if wait_for_test "rust_test" "Rust Test Suite"; then
    RESULTS["rust_test"]="PASSED"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    RESULTS["rust_test"]="FAILED"
fi

# Wait for npm and dependency tests
print_status "Waiting for npm and dependency tests..."
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if wait_for_test "npm_test" "npm Test Suite"; then
    RESULTS["npm_test"]="PASSED"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    RESULTS["npm_test"]="FAILED"
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if wait_for_test "dependencies_check" "Package Dependencies Check"; then
    RESULTS["dependencies_check"]="PASSED"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    RESULTS["dependencies_check"]="FAILED"
fi

# Add quick check results
TOTAL_TESTS=$((TOTAL_TESTS + 2))
RESULTS["tauri_cli"]="$TAURI_CLI_STATUS"
RESULTS["node_version"]="$NODE_VERSION_STATUS"

if [[ "$TAURI_CLI_STATUS" == "PASSED" ]]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi

if [[ "$NODE_VERSION_STATUS" == "PASSED" ]]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi

# Calculate execution time
END_TIME=$(date +%s)
EXECUTION_TIME=$((END_TIME - START_TIME))

# Generate comprehensive report
print_status "=== Parallel Build Verification Summary ==="
echo ""
echo "Execution Time: ${EXECUTION_TIME}s"
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

# Priority-based issue reporting
echo ""
echo "Build Status Analysis:"
echo "======================"

CRITICAL_FAILURES=0
WARNINGS=0

# Critical issues that prevent building
if [[ "${RESULTS[typescript_build]}" == "FAILED" ]]; then
    print_error "🚨 CRITICAL: TypeScript compilation failed - build will not work"
    CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))
fi

if [[ "${RESULTS[rust_check]}" == "FAILED" ]]; then
    print_error "🚨 CRITICAL: Rust compilation failed - Tauri backend will not work"
    CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))
fi

# Important issues that affect code quality
if [[ "${RESULTS[typescript_typecheck]}" == "FAILED" ]]; then
    print_warning "⚠️  WARNING: TypeScript type checking failed - may have type safety issues"
    WARNINGS=$((WARNINGS + 1))
fi

if [[ "${RESULTS[eslint_check]}" == "FAILED" ]]; then
    print_warning "⚠️  WARNING: ESLint issues found - code quality needs attention"
    WARNINGS=$((WARNINGS + 1))
fi

if [[ "${RESULTS[npm_test]}" == "FAILED" ]]; then
    print_warning "⚠️  WARNING: Test failures detected - functionality may be compromised"
    WARNINGS=$((WARNINGS + 1))
fi

if [[ "${RESULTS[rust_test]}" == "FAILED" ]]; then
    print_warning "⚠️  WARNING: Rust test failures - backend functionality may be compromised"
    WARNINGS=$((WARNINGS + 1))
fi

# Environment setup issues
if [[ "${RESULTS[tauri_cli]}" == "FAILED" ]]; then
    print_warning "💡 INFO: Tauri CLI not found - install with: cargo install tauri-cli"
fi

if [[ "${RESULTS[dependencies_check]}" == "FAILED" ]]; then
    print_warning "💡 INFO: Package dependency issues detected - run: npm install"
fi

# Final recommendation
echo ""
echo "Recommendations:"
echo "================"

if [[ "$CRITICAL_FAILURES" -gt 0 ]]; then
    print_error "❌ BUILD NOT READY: $CRITICAL_FAILURES critical failure(s) must be fixed before deployment"
    echo "   Priority: Fix TypeScript and/or Rust compilation errors first"
elif [[ "$WARNINGS" -gt 0 ]]; then
    print_warning "⚠️  BUILD USABLE: $WARNINGS warning(s) detected - consider fixing before production"
    echo "   Priority: Address test failures and code quality issues"
else
    print_success "✅ BUILD READY: All tests passed - ready for development and deployment"
fi

# Cleanup
rm -rf "$TEST_OUTPUT_DIR"

# Exit with appropriate status
if [[ "$CRITICAL_FAILURES" -gt 0 ]]; then
    exit 1
elif [[ "$WARNINGS" -gt 0 ]]; then
    exit 2
else
    exit 0
fi