#!/bin/bash
echo "🛑 Stopping Bot Platform..."
docker compose down 2>/dev/null || true
echo "✅ Stopped."
