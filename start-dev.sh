#!/bin/bash

# Start dev server with Node 20
# This ensures better-sqlite3 works correctly

# Set Node 20 in PATH
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"

# Verify Node version
NODE_VERSION=$(node --version)
echo "Using Node.js: $NODE_VERSION"

if [[ ! "$NODE_VERSION" =~ ^v20\. ]]; then
    echo "⚠️  Warning: Not using Node 20. Current version: $NODE_VERSION"
    echo "Please ensure Node 20 is in your PATH"
    exit 1
fi

# Rebuild better-sqlite3 if needed
echo "Checking better-sqlite3..."
npm rebuild better-sqlite3 > /dev/null 2>&1

# Start dev server
echo "Starting Next.js dev server..."
npm run dev
