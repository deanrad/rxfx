#!/bin/bash
set -e

# Run the analysis script and capture output
echo "Computing reverse topological order and generating version bump commands..."
node scripts/bump-versions.mjs

# Extract commands and run them
echo ""
echo "Executing version bumps in topological order..."
node scripts/bump-versions.mjs | grep "yarn workspace" | sed 's/^[0-9]*\. //' | while read cmd; do
  echo "Running: $cmd"
  eval "$cmd"
done

echo "Applying version changes..."
yarn version apply
