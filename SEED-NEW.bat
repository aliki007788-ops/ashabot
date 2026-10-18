@echo off
chcp 65001 >nul
echo Updating database and adding new clusters...
cd /d "%~dp0apps\api"
call pnpm exec prisma db push
call node prisma\seed-new-clusters.cjs
echo.
echo Done. Restart the API.
pause
