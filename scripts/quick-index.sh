#!/bin/bash

# Quick script to index backend and golang knowledge bases
# Make sure your dev server is running: npm run dev

echo "Indexing backend and golang knowledge bases..."
echo "Make sure your dev server is running (npm run dev)"
echo ""

# Index backend
echo "Indexing backend..."
curl -X POST http://localhost:3000/api/index \
  -H "Content-Type: application/json" \
  -d '{"knowledgebase":"backend"}' \
  && echo "✅ Backend indexed" || echo "❌ Failed to index backend"

echo ""

# Index golang
echo "Indexing golang..."
curl -X POST http://localhost:3000/api/index \
  -H "Content-Type: application/json" \
  -d '{"knowledgebase":"golang"}' \
  && echo "✅ Golang indexed" || echo "❌ Failed to index golang"

echo ""
echo "Done! Refresh your browser to see backend and golang."

