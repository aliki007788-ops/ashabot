cd C:\Users\K.ali\Desktop\bot-platform01

Write-Host "=== Step 1: Current status ===" -ForegroundColor Cyan
git status

Write-Host ""
Write-Host "=== Step 2: Adding files ===" -ForegroundColor Cyan
git add .gitignore
git add START.bat
git add UPGRADE-FA.md
git add SEED-NEW.bat
git add apps/api/package.json
git add apps/api/src/modules/bots/bots.service.ts
git add apps/api/src/modules/crm/crm.routes.ts
git add apps/api/src/modules/marketplace/marketplace.routes.ts
git add apps/api/src/plugins/error-handler.ts
git add apps/api/scripts/local.cjs
git add apps/api/src/lib/dbmode.ts

Write-Host ""
Write-Host "=== Step 3: Staged files ===" -ForegroundColor Cyan
git status

Write-Host ""
Write-Host "=== Step 4: Commit ===" -ForegroundColor Cyan
git commit -m "feat: add local SQLite mode, dbmode helper, fix error handler"

Write-Host ""
Write-Host "=== Step 5: Push to GitHub ===" -ForegroundColor Cyan
git push origin main

Write-Host ""
Write-Host "=== Step 6: Final log ===" -ForegroundColor Cyan
git log --oneline -3

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Green