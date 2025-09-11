#!/bin/bash
set -e

echo "🗑️ Deleting ALL workflow runs in batches..."

# Get all workflow run IDs in batches of 50
for i in {1..20}; do
    echo "Processing batch $i..."
    
    # Get 50 workflow runs
    run_ids=$(gh run list --limit 50 --json databaseId --jq '.[].databaseId' | head -50)
    
    if [ -z "$run_ids" ]; then
        echo "No more workflows to delete"
        break
    fi
    
    # Delete each run in this batch
    echo "$run_ids" | while IFS= read -r run_id; do
        if [ ! -z "$run_id" ]; then
            echo "Deleting run: $run_id"
            printf 'y\n' | gh run delete "$run_id" 2>/dev/null || echo "Skipped $run_id"
        fi
    done
    
    sleep 2  # Rate limit protection
    
    # Check remaining count
    remaining=$(gh run list --limit 1000 --json databaseId | jq '. | length')
    echo "Remaining workflows: $remaining"
    
    if [ "$remaining" -eq 0 ]; then
        break
    fi
done

echo "✅ Workflow deletion completed!"