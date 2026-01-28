#!/bin/bash

# Rebuild Docker containers with fresh build
echo "🛑 Stopping containers and removing volumes..."
docker-compose down -v

echo "🔨 Building app image (no cache)..."
docker-compose build --no-cache app

echo "🚀 Starting containers..."
docker-compose up -d

echo "✅ Done! Containers are rebuilding with your latest changes."

