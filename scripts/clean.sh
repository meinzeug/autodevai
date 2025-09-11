#!/bin/bash
set -e

echo "🧹 AutoDev-AI Build Artifact Cleaner"
echo "===================================="

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Function to safely remove directory if it exists
safe_remove() {
    local target="$1"
    local description="$2"
    
    if [ -d "$target" ] || [ -f "$target" ]; then
        rm -rf "$target"
        print_status "Removed $description"
    else
        print_warning "$description not found (already clean)"
    fi
}

echo ""
echo "Starting cleanup process..."

# Remove Node.js dependencies
print_status "Cleaning Node.js artifacts..."
safe_remove "node_modules" "Node.js modules"
safe_remove ".npm" "NPM cache"

# Remove Rust build artifacts
print_status "Cleaning Rust build artifacts..."
safe_remove "src-tauri/target" "Rust target directory"

# Remove distribution directories
print_status "Cleaning distribution artifacts..."
safe_remove "dist" "Distribution directory"
safe_remove "dist-bundles" "Bundle distribution directory"
safe_remove "src-tauri/target/release/bundle" "Release bundles"

# Remove temporary and cache directories
print_status "Cleaning temporary files..."
safe_remove ".cache" "Cache directory"
safe_remove "tmp" "Temporary directory"
safe_remove ".tmp" "Hidden temporary directory"

# Remove log files
print_status "Cleaning log files..."
safe_remove "*.log" "Log files"
safe_remove "logs" "Logs directory"

# Remove OS-specific files
print_status "Cleaning OS-specific artifacts..."
safe_remove ".DS_Store" "macOS metadata"
safe_remove "Thumbs.db" "Windows thumbnails"
safe_remove "desktop.ini" "Windows desktop config"

# Optional full cleanup (lock files and more aggressive cleanup)
if [ "$1" == "--full" ]; then
    echo ""
    print_warning "Performing FULL cleanup (including lock files)..."
    
    # Remove lock files
    safe_remove "package-lock.json" "NPM lock file"
    safe_remove "yarn.lock" "Yarn lock file"
    safe_remove "src-tauri/Cargo.lock" "Cargo lock file"
    
    # Remove IDE and editor files
    safe_remove ".vscode" "VS Code settings"
    safe_remove ".idea" "IntelliJ IDEA settings"
    safe_remove "*.swp" "Vim swap files"
    safe_remove "*.swo" "Vim swap files"
    safe_remove "*~" "Editor backup files"
    
    # Remove environment files (be careful!)
    if [ -f ".env.local" ]; then
        print_warning "Found .env.local - NOT removing (contains sensitive data)"
    fi
    safe_remove ".env.backup" "Environment backup"
    
    print_status "Full cleanup completed"
else
    echo ""
    print_warning "Standard cleanup completed"
    print_warning "Use --full flag for complete cleanup (including lock files)"
fi

echo ""
echo "🎉 Cleanup process completed successfully!"
echo ""
echo "Usage examples:"
echo "  ./scripts/clean.sh         # Standard cleanup"
echo "  ./scripts/clean.sh --full  # Full cleanup including lock files"
echo ""

# Return success
exit 0