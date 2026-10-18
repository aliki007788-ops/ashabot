#!/usr/bin/env bash
# اجرا: bash deploy.sh   (از داخل پوشه deploy)
set -e
cd "$(dirname "$0")"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "فایل .env ساخته شد. آن را ویرایش کنید (nano .env) و دوباره deploy.sh را اجرا کنید."
  exit 1
fi
docker compose build
docker compose up -d
echo "تمام شد. وضعیت: docker compose ps | لاگ API: docker compose logs -f api"
