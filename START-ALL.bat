@echo off
chcp 65001 >nul
title Eitbal Platform - Startup

echo ============================================
echo   Eitbal Platform - Starting All Services
echo ============================================
echo.

echo [1/2] Starting API on port 4000...
start "API - port 4000" cmd /k "cd /d C:\Users\K.ali\Desktop\bot-platform01 && pnpm --filter @bot-platform/api dev"

timeout /t 8 /nobreak >nul

echo [2/2] Starting Web on port 3000...
start "Web - port 3000" cmd /k "cd /d C:\Users\K.ali\Desktop\bot-platform01 && pnpm --filter @bot-platform/web dev"

echo.
echo ============================================
echo   Done! Services are starting...
echo ============================================
echo.
echo   API:  http://localhost:4000
echo   Web:  http://localhost:3000
echo   Bots: http://localhost:3000/bots
echo.
timeout /t 5 /nobreak >nul
start http://localhost:3000/bots
exit