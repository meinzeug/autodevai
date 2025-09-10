#!/bin/bash
set -e

echo "🗑️ Deleting ALL 760 workflow runs..."

# Get all completed workflow run IDs and delete them
gh run list --limit 1000 --json databaseId,status,conclusion | \
jq -r '.[] | select(.status == "completed") | .databaseId' | \
while IFS= read -r run_id; do
    if [ ! -z "$run_id" ]; then
        echo "Deleting workflow run: $run_id"
        gh run delete "$run_id" --yes || echo "Failed to delete $run_id, continuing..."
        sleep 0.1  # Small delay to avoid rate limits
    fi
done

echo "✅ All workflow runs deleted!"