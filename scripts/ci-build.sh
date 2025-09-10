#!/bin/bash
set -euo pipefail
echo "Starting CI build..."
# Install dependencies
echo "Installing Node dependencies..."
npm ci
# Build frontend
echo "Building frontend..."
npm run build
# Test frontend
echo "Running frontend tests..."
npm test -- --run
# Build Tauri
echo "Building Tauri application..."
cd src-tauri
cargo build --release
cd ..
# Run Rust tests
echo "Running Rust tests..."
cd src-tauri
cargo test
cd ..
echo "CI build completed successfully!"
