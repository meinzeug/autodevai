#!/bin/bash
set -e
echo "Running post-build tasks..."
# Get target directory
TARGET_DIR="${CARGO_TARGET_DIR:-target}"
# Create distribution directory
mkdir -p ../dist-bundles
# Copy bundles
if [ -d "$TARGET_DIR/release/bundle" ]; then
    cp -r "$TARGET_DIR/release/bundle/"* ../dist-bundles/
    echo "Bundles copied to dist-bundles/"
fi
echo "Post-build tasks completed"
