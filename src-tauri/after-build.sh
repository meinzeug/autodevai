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

# Create checksums for integrity verification
if [ -d "../dist-bundles" ]; then
    cd ../dist-bundles
    for file in *; do
        if [ -f "$file" ]; then
            sha256sum "$file" > "$file.sha256"
            echo "Checksum created for $file"
        fi
    done
    cd - > /dev/null
fi

# Create build metadata
BUILD_INFO="../dist-bundles/build-info.json"
cat > "$BUILD_INFO" << EOF
{
  "buildTime": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "rustVersion": "$(rustc --version)",
  "tauriVersion": "$(cargo tauri --version 2>/dev/null || echo 'unknown')",
  "target": "${CARGO_BUILD_TARGET:-$(rustc -vV | grep host | cut -d' ' -f2)}",
  "profile": "release",
  "commit": "$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
  "branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')"
}
EOF

echo "Post-build tasks completed successfully"
echo "Artifacts available in dist-bundles/"