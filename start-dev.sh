#!/bin/bash
# Start dev server with Node.js 20

export PATH="/opt/homebrew/opt/node@20/bin:$PATH"

# Verify Node version
NODE_VERSION=$(node --version)
echo "Using Node.js: $NODE_VERSION"

# Rebuild better-sqlite3 to ensure it's compiled for the correct Node version
echo "Rebuilding better-sqlite3..."
npm rebuild better-sqlite3

# Start the dev server
echo "Starting Next.js dev server..."
npm run dev

