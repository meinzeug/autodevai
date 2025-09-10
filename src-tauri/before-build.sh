#!/bin/bash
set -e
echo "Running pre-build tasks..."

# Ensure icons exist
if [ ! -f "icons/icon.png" ]; then
    echo "Error: Missing icon.png"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "Cargo.toml" ]; then
    echo "Error: Not in Tauri src directory"
    exit 1
fi

# Check Rust formatting
echo "Checking Rust code formatting..."
cargo fmt -- --check

# Run clippy for code quality
echo "Running Clippy checks..."
cargo clippy -- -D warnings

# Validate Tauri configuration
echo "Validating Tauri configuration..."
if [ -f "tauri.conf.json" ]; then
    # Basic JSON validation
    if ! python3 -m json.tool tauri.conf.json > /dev/null 2>&1; then
        echo "Error: Invalid JSON in tauri.conf.json"
        exit 1
    fi
    echo "Tauri configuration is valid"
fi

# Check for required dependencies
echo "Checking dependencies..."
cargo check --release

echo "Pre-build checks passed successfully"