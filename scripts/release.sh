#!/bin/bash
set -e

VERSION=${1:?Version required}

echo "Creating release $VERSION..."

# Ensure clean working directory
if [ -n "$(git status --porcelain)" ]; then
    echo "Error: Working directory not clean"
    exit 1
fi

# Checkout main branch
git checkout main
git pull origin main

# Merge development
git merge development --no-ff -m "chore: merge development for release $VERSION"

# Run version bump
./scripts/version-bump.sh $VERSION

# Build all variants
./scripts/build-all.sh

# Create GitHub release (requires gh CLI)
if command -v gh &> /dev/null; then
    gh release create "v$VERSION" \
        --title "Release v$VERSION" \
        --generate-notes \
        dist-bundles/*
fi

echo "Release $VERSION complete"
