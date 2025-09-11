#!/bin/bash
# Test Coverage Script for Neural Bridge Platform
# Generates comprehensive test coverage reports for Rust backend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Neural Bridge Platform - Test Coverage Report${NC}"
echo "=================================================="

# Create coverage directory
mkdir -p coverage
mkdir -p target/coverage

# Clean previous coverage data
echo -e "${YELLOW}📝 Cleaning previous coverage data...${NC}"
rm -rf coverage/*.profraw
rm -rf target/coverage/*

# Set environment variables for coverage
export RUSTFLAGS="-C instrument-coverage"
export LLVM_PROFILE_FILE="coverage/neural-bridge-%p-%m.profraw"

echo -e "${YELLOW}🔧 Building with coverage instrumentation...${NC}"
cargo build --profile coverage

echo -e "${YELLOW}🧪 Running unit tests with coverage...${NC}"
cargo test --profile coverage --lib -- --test-threads=1

echo -e "${YELLOW}🔗 Running integration tests with coverage...${NC}"
cargo test --profile coverage --test integration_tests -- --test-threads=1

echo -e "${YELLOW}🔐 Running security tests with coverage...${NC}"
cargo test --profile coverage --test security_tests -- --test-threads=1

echo -e "${YELLOW}🌐 Running API tests with coverage...${NC}"
cargo test --profile coverage --test api_tests -- --test-threads=1

echo -e "${YELLOW}⚡ Running performance tests with coverage...${NC}"
cargo test --profile coverage --test performance_tests -- --test-threads=1

echo -e "${YELLOW}🗄️ Running database tests with coverage...${NC}"
cargo test --profile coverage --test database_tests -- --test-threads=1

echo -e "${YELLOW}📋 Running command tests with coverage...${NC}"
cargo test --profile coverage --test commands_tests -- --test-threads=1

echo -e "${YELLOW}🧮 Processing coverage data...${NC}"

# Check if llvm-profdata is available
if command -v llvm-profdata &> /dev/null; then
    # Merge profraw files
    llvm-profdata merge -sparse coverage/*.profraw -o coverage/neural-bridge.profdata
    
    # Check if llvm-cov is available
    if command -v llvm-cov &> /dev/null; then
        # Generate coverage report
        echo -e "${YELLOW}📊 Generating coverage report...${NC}"
        
        # Find the test binary
        TEST_BINARY=$(find target/coverage -name "neural_bridge_platform-*" -type f | head -1)
        
        if [ -n "$TEST_BINARY" ]; then
            # Generate HTML report
            llvm-cov show \
                "$TEST_BINARY" \
                -instr-profile=coverage/neural-bridge.profdata \
                -format=html \
                -output-dir=target/coverage/html \
                -ignore-filename-regex="/cargo/"
            
            # Generate text summary
            llvm-cov report \
                "$TEST_BINARY" \
                -instr-profile=coverage/neural-bridge.profdata \
                -ignore-filename-regex="/cargo/" > target/coverage/summary.txt
            
            # Generate lcov format for CI integration
            llvm-cov export \
                "$TEST_BINARY" \
                -instr-profile=coverage/neural-bridge.profdata \
                -format=lcov \
                -ignore-filename-regex="/cargo/" > target/coverage/lcov.info
            
            echo -e "${GREEN}✅ Coverage report generated successfully!${NC}"
            echo -e "${BLUE}📁 Reports available at:${NC}"
            echo "  - HTML: target/coverage/html/index.html"
            echo "  - Summary: target/coverage/summary.txt"
            echo "  - LCOV: target/coverage/lcov.info"
            
            # Display summary
            echo -e "${BLUE}📊 Coverage Summary:${NC}"
            head -20 target/coverage/summary.txt
            
        else
            echo -e "${RED}❌ Could not find test binary for coverage report${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠️ llvm-cov not found, coverage data collected but report not generated${NC}"
        echo "Install llvm-tools-preview: rustup component add llvm-tools-preview"
    fi
else
    echo -e "${YELLOW}⚠️ llvm-profdata not found, using cargo-llvm-cov instead${NC}"
    
    # Try cargo-llvm-cov as fallback
    if command -v cargo-llvm-cov &> /dev/null; then
        echo -e "${YELLOW}📊 Generating coverage with cargo-llvm-cov...${NC}"
        cargo llvm-cov --html --output-dir target/coverage/html
        cargo llvm-cov --lcov --output-path target/coverage/lcov.info
        cargo llvm-cov --text > target/coverage/summary.txt
        
        echo -e "${GREEN}✅ Coverage report generated with cargo-llvm-cov!${NC}"
    else
        echo -e "${RED}❌ Neither llvm-tools nor cargo-llvm-cov available${NC}"
        echo "Install one of:"
        echo "  - rustup component add llvm-tools-preview"
        echo "  - cargo install cargo-llvm-cov"
        exit 1
    fi
fi

# Calculate coverage percentage from summary
if [ -f target/coverage/summary.txt ]; then
    COVERAGE_PERCENT=$(grep -E "^TOTAL" target/coverage/summary.txt | awk '{print $10}' | sed 's/%//' || echo "0")
    
    if [ "$COVERAGE_PERCENT" -ge 80 ]; then
        echo -e "${GREEN}🎉 Great! Coverage is ${COVERAGE_PERCENT}% (≥80%)${NC}"
    elif [ "$COVERAGE_PERCENT" -ge 70 ]; then
        echo -e "${YELLOW}⚠️ Coverage is ${COVERAGE_PERCENT}% (≥70% but <80%)${NC}"
    else
        echo -e "${RED}❌ Coverage is ${COVERAGE_PERCENT}% (<70%) - needs improvement${NC}"
    fi
fi

echo -e "${BLUE}✨ Test coverage analysis complete!${NC}"