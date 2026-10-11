#!/bin/bash
set -e

echo "⚠️  This will DELETE all data and reset the database."
read -p "Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Cancelled."
  exit 0
fi

echo "🛑 Stopping services..."
docker compose down -v 2>/dev/null || true

echo "🗑️  Removing .env..."
rm -f .env

echo "🔄 Running setup again..."
bash scripts/setup.sh
