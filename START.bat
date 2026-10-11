@echo off
chcp 65001 >nul
title Eitbal Platform

echo ============================================
echo   Eitbal Platform - Starting...
echo ============================================
echo.

echo [1/2] Starting API (port 4000)...
start "API-4000" cmd /k "cd /d C:\Users\K.ali\Desktop\bot-platform01 && pnpm --filter @bot-platform/api dev"

timeout /t 8 /nobreak >nul

echo [2/2] Starting Web (port 3000)...
start "Web-3000" cmd /k "cd /d C:\Users\K.ali\Desktop\bot-platform01 && pnpm --filter @bot-platform/web dev"

echo.
echo ============================================
echo   Services are starting...
echo ============================================
echo.
echo   API:  http://localhost:4000
echo   Web:  http://localhost:3000
echo.
echo   Waiting 10 seconds then opening browser...
timeout /t 10 /nobreak >nul

start http://localhost:3000/login

echo.
echo Done. You can close this window.
pause