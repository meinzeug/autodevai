#!/bin/bash
set -e
echo "Running pre-build tasks..."
# Ensure icons exist
if [ ! -f "icons/icon.png" ]; then
    echo "Error: Missing icon.png"
    exit 1
fi
# Check Rust formatting
cargo fmt -- --check
# Run clippy
cargo clippy -- -D warnings
echo "Pre-build checks passed"
