#!/bin/bash
set -e

echo "=========================================="
echo "  Bot Platform — Starting..."
echo "=========================================="
echo ""

# Ensure docker services are up
echo "🐳 Checking Docker services..."
docker compose up -d postgres redis 2>/dev/null || true
sleep 2

# Check .env
if [ ! -f .env ]; then
  echo "❌ .env not found. Run ./scripts/setup.sh first."
  exit 1
fi

echo "🚀 Starting API + Web..."
echo ""
echo "  Frontend → http://localhost:3000"
echo "  API      → http://localhost:4000"
echo "  Health   → http://localhost:4000/health"
echo ""
echo "  Press Ctrl+C to stop"
echo "=========================================="
echo ""

pnpm dev
