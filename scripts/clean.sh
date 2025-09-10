#!/bin/bash
set -e
echo "Cleaning build artifacts..."
# Remove node_modules
rm -rf node_modules
# Remove Rust target
rm -rf src-tauri/target
# Remove dist directories
rm -rf dist dist-bundles
# Remove lock files (optional)
if [ "$1" == "--full" ]; then
    rm -f package-lock.json
    rm -f src-tauri/Cargo.lock
    echo "Removed lock files"
fi
echo "Clean complete"
