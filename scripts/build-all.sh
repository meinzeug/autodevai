#!/bin/bash
set -e

echo "Building all variants..."

# Development build
echo "Building development version..."
npm run tauri:build -- --debug

# Production build
echo "Building production version..."
npm run tauri:build

# Linux-specific builds
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Building AppImage..."
    npm run tauri:build -- --bundles appimage

    echo "Building Debian package..."
    npm run tauri:build -- --bundles deb
fi

echo "All builds completed"
