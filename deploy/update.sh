#!/usr/bin/env bash
# بعد از جایگزینی فایل‌های جدید پروژه: bash update.sh
set -e
cd "$(dirname "$0")"
bash backup.sh
docker compose build
docker compose up -d
