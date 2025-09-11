#!/bin/bash
set -e

VERSION_TYPE=${1:-patch}
SKIP_GIT=${2:-false}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[VERSION]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Validate version type
case "$VERSION_TYPE" in
    major|minor|patch|premajor|preminor|prepatch|prerelease)
        ;;
    *)
        error "Invalid version type: $VERSION_TYPE. Use: major, minor, patch, premajor, preminor, prepatch, prerelease"
        ;;
esac

log "Bumping version: $VERSION_TYPE"

# Check if we're in a git repository
if [ ! -d ".git" ] && [ "$SKIP_GIT" != "true" ]; then
    error "Not in a git repository. Use SKIP_GIT=true to skip git operations."
fi

# Check for uncommitted changes
if [ "$SKIP_GIT" != "true" ]; then
    if ! git diff --quiet || ! git diff --staged --quiet; then
        error "Uncommitted changes detected. Please commit or stash changes first."
    fi
fi

# Backup current versions
BACKUP_DIR=".version-backup-$(date +%s)"
mkdir -p "$BACKUP_DIR"
[ -f "package.json" ] && cp "package.json" "$BACKUP_DIR/"
[ -f "src-tauri/Cargo.toml" ] && cp "src-tauri/Cargo.toml" "$BACKUP_DIR/"
[ -f "src-tauri/tauri.conf.json" ] && cp "src-tauri/tauri.conf.json" "$BACKUP_DIR/"

# Function to restore backups on error
restore_backups() {
    log "Restoring backups due to error..."
    [ -f "$BACKUP_DIR/package.json" ] && cp "$BACKUP_DIR/package.json" .
    [ -f "$BACKUP_DIR/Cargo.toml" ] && cp "$BACKUP_DIR/Cargo.toml" src-tauri/
    [ -f "$BACKUP_DIR/tauri.conf.json" ] && cp "$BACKUP_DIR/tauri.conf.json" src-tauri/
    rm -rf "$BACKUP_DIR"
}

# Set up error handling
trap restore_backups ERR

# Bump npm version
log "Updating package.json version..."
npm version "$VERSION_TYPE" --no-git-tag-version --no-commit-hooks

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
log "New version: $NEW_VERSION"

# Update Cargo.toml
if [ -f "src-tauri/Cargo.toml" ]; then
    log "Updating Cargo.toml version..."
    if command -v sed >/dev/null 2>&1; then
        # Use sed for cross-platform compatibility
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS sed
            sed -i '' "s/^version = .*/version = \"$NEW_VERSION\"/" src-tauri/Cargo.toml
        else
            # GNU sed
            sed -i "s/^version = .*/version = \"$NEW_VERSION\"/" src-tauri/Cargo.toml
        fi
    else
        error "sed command not available"
    fi
fi

# Update tauri.conf.json
if [ -f "src-tauri/tauri.conf.json" ]; then
    log "Updating tauri.conf.json version..."
    if command -v jq >/dev/null 2>&1; then
        # Use jq for proper JSON handling
        tmp=$(mktemp)
        jq ".package.version = \"$NEW_VERSION\"" src-tauri/tauri.conf.json > "$tmp" && mv "$tmp" src-tauri/tauri.conf.json
    else
        # Fallback to sed
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" src-tauri/tauri.conf.json
        else
            sed -i "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" src-tauri/tauri.conf.json
        fi
    fi
fi

# Update Cargo.lock if it exists
if [ -f "src-tauri/Cargo.lock" ]; then
    log "Updating Cargo.lock..."
    cd src-tauri
    cargo check --quiet
    cd ..
fi

# Validate the changes
log "Validating version updates..."
PACKAGE_VERSION=$(node -p "require('./package.json').version")
if [ -f "src-tauri/Cargo.toml" ]; then
    CARGO_VERSION=$(grep '^version =' src-tauri/Cargo.toml | head -1 | cut -d'"' -f2)
fi
if [ -f "src-tauri/tauri.conf.json" ]; then
    TAURI_VERSION=$(jq -r '.package.version' src-tauri/tauri.conf.json 2>/dev/null || grep '"version"' src-tauri/tauri.conf.json | head -1 | cut -d'"' -f4)
fi

# Check version consistency
if [ "$PACKAGE_VERSION" != "$NEW_VERSION" ]; then
    error "Version mismatch in package.json: expected $NEW_VERSION, got $PACKAGE_VERSION"
fi

if [ -n "$CARGO_VERSION" ] && [ "$CARGO_VERSION" != "$NEW_VERSION" ]; then
    error "Version mismatch in Cargo.toml: expected $NEW_VERSION, got $CARGO_VERSION"
fi

if [ -n "$TAURI_VERSION" ] && [ "$TAURI_VERSION" != "$NEW_VERSION" ]; then
    error "Version mismatch in tauri.conf.json: expected $NEW_VERSION, got $TAURI_VERSION"
fi

# Git operations
if [ "$SKIP_GIT" != "true" ]; then
    log "Creating git commit and tag..."
    
    # Add updated files
    git add package.json package-lock.json 2>/dev/null || true
    [ -f "src-tauri/Cargo.toml" ] && git add src-tauri/Cargo.toml
    [ -f "src-tauri/Cargo.lock" ] && git add src-tauri/Cargo.lock
    [ -f "src-tauri/tauri.conf.json" ] && git add src-tauri/tauri.conf.json
    
    # Create commit
    git commit -m "chore: bump version to $NEW_VERSION"
    
    # Create tag
    git tag -a "v$NEW_VERSION" -m "Version $NEW_VERSION"
    
    log "Git commit and tag created for version $NEW_VERSION"
fi

# Clean up backups
rm -rf "$BACKUP_DIR"

success "Version bumped to $NEW_VERSION successfully!"

# Display next steps
echo -e "\n${YELLOW}Next steps:${NC}"
if [ "$SKIP_GIT" != "true" ]; then
    echo "  git push origin main"
    echo "  git push --tags"
fi
echo "  ./scripts/build-all.sh"
echo "  Create GitHub release with: gh release create v$NEW_VERSION"