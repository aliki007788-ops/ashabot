#!/usr/bin/env bash
# پشتیبان‌گیری از دیتابیس: bash backup.sh
set -e
cd "$(dirname "$0")"
mkdir -p backups
F="backups/ashabot-$(date +%Y%m%d-%H%M).sql.gz"
docker compose exec -T db pg_dump -U botuser botplatform | gzip > "$F"
echo "ذخیره شد: $F"
