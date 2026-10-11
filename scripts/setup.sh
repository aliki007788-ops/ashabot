#!/bin/bash
set -e

echo "=========================================="
echo "  Bot Platform — Setup"
echo "=========================================="
echo ""

# Check pnpm
if ! command -v pnpm &> /dev/null; then
  echo "📦 Installing pnpm..."
  npm install -g pnpm@9
fi

# Check docker
if ! command -v docker &> /dev/null; then
  echo "❌ Docker is required. Please install Docker first."
  exit 1
fi

echo "1️⃣  Installing dependencies..."
pnpm install

echo ""
echo "2️⃣  Setting up environment..."
if [ ! -f .env ]; then
  cp .env.example .env
  # Generate secure JWT secrets
  ACCESS_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
  REFRESH_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
  # Update secrets in .env
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/change-me-to-a-long-random-string-min-32-chars/$ACCESS_SECRET/" .env
    sed -i '' "s/change-me-to-another-long-random-string-min-32/$REFRESH_SECRET/" .env
  else
    sed -i "s/change-me-to-a-long-random-string-min-32-chars/$ACCESS_SECRET/" .env
    sed -i "s/change-me-to-another-long-random-string-min-32/$REFRESH_SECRET/" .env
  fi
  echo "   ✅ .env created with secure JWT secrets"
  echo "   ⚠️  Please add your OPENAI_API_KEY to .env"
else
  echo "   ✅ .env already exists"
fi

echo ""
echo "3️⃣  Starting Postgres + Redis..."
docker compose up -d postgres redis

echo ""
echo "4️⃣  Waiting for database..."
sleep 5

echo ""
echo "5️⃣  Running migrations..."
pnpm --filter @bot-platform/api prisma migrate dev --name init --skip-seed 2>/dev/null || \
pnpm --filter @bot-platform/api prisma db push

echo ""
echo "6️⃣  Generating Prisma Client..."
pnpm --filter @bot-platform/api prisma generate

echo ""
echo "7️⃣  Seeding database..."
pnpm --filter @bot-platform/api prisma db seed || echo "   ⚠️  Seed skipped (may already exist)"

echo ""
echo "=========================================="
echo "  ✅ Setup Complete!"
echo "=========================================="
echo ""
echo "  Next steps:"
echo "  1. Add OPENAI_API_KEY to .env"
echo "  2. Run:  ./scripts/start.sh"
echo "     or:   pnpm dev"
echo ""
echo "  Frontend: http://localhost:3000"
echo "  API:      http://localhost:4000"
echo ""
