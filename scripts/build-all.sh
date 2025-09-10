#!/bin/bash
set -e

echo "🚀 Building all variants..."

# Configuration
BUILD_DIR="dist-bundles"
LOG_FILE="build-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Clean previous builds
log "Cleaning previous builds..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Check environment
if [ ! -f "package.json" ]; then
    error "Not in project root directory"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    log "Installing Node.js dependencies..."
    npm ci
fi

# Development build
log "Building development version..."
if npm run tauri:build -- --debug; then
    success "Development build completed"
else
    error "Development build failed"
fi

# Production build
log "Building production version..."
if npm run tauri:build; then
    success "Production build completed"
else
    error "Production build failed"
fi

# Platform-specific builds
case "$OSTYPE" in
    linux-gnu*)
        log "Detected Linux - building Linux-specific packages..."
        
        # AppImage build
        log "Building AppImage..."
        if npm run tauri:build -- --bundles appimage; then
            success "AppImage build completed"
        else
            warning "AppImage build failed"
        fi
        
        # Debian package build
        log "Building Debian package..."
        if npm run tauri:build -- --bundles deb; then
            success "Debian package build completed"
        else
            warning "Debian package build failed"
        fi
        
        # RPM package build (if available)
        log "Building RPM package..."
        if npm run tauri:build -- --bundles rpm; then
            success "RPM package build completed"
        else
            warning "RPM package build failed (may not be supported)"
        fi
        ;;
        
    darwin*)
        log "Detected macOS - building macOS-specific packages..."
        
        # DMG build
        log "Building DMG..."
        if npm run tauri:build -- --bundles dmg; then
            success "DMG build completed"
        else
            warning "DMG build failed"
        fi
        
        # App bundle
        log "Building App bundle..."
        if npm run tauri:build -- --bundles app; then
            success "App bundle build completed"
        else
            warning "App bundle build failed"
        fi
        ;;
        
    msys*|cygwin*|win32*)
        log "Detected Windows - building Windows-specific packages..."
        
        # MSI installer
        log "Building MSI installer..."
        if npm run tauri:build -- --bundles msi; then
            success "MSI installer build completed"
        else
            warning "MSI installer build failed"
        fi
        
        # NSIS installer
        log "Building NSIS installer..."
        if npm run tauri:build -- --bundles nsis; then
            success "NSIS installer build completed"
        else
            warning "NSIS installer build failed"
        fi
        ;;
        
    *)
        warning "Unknown OS type: $OSTYPE"
        ;;
esac

# Create universal archive
log "Creating universal archive..."
ARCHIVE_NAME="autodevai-$(date +%Y%m%d-%H%M%S).tar.gz"
if [ -d "$BUILD_DIR" ] && [ "$(ls -A $BUILD_DIR)" ]; then
    tar -czf "$ARCHIVE_NAME" -C "$BUILD_DIR" .
    mv "$ARCHIVE_NAME" "$BUILD_DIR/"
    success "Universal archive created: $ARCHIVE_NAME"
fi

# Generate build report
REPORT_FILE="$BUILD_DIR/build-report.json"
cat > "$REPORT_FILE" << EOF
{
  "buildTime": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "platform": "$OSTYPE",
  "nodeVersion": "$(node --version)",
  "npmVersion": "$(npm --version)",
  "rustVersion": "$(rustc --version)",
  "tauriVersion": "$(cargo tauri --version 2>/dev/null || echo 'unknown')",
  "commit": "$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
  "branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')",
  "artifacts": $(find "$BUILD_DIR" -type f -name "*" | jq -R . | jq -s .)
}
EOF

success "All builds completed successfully!"
log "Build artifacts available in: $BUILD_DIR"
log "Build log saved as: $LOG_FILE"

# Display summary
echo -e "\n${GREEN}📦 Build Summary:${NC}"
find "$BUILD_DIR" -type f -exec ls -lh {} \; | awk '{print $9 "\t" $5}'