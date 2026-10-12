@echo off
setlocal
cd /d "%~dp0"
title C + D Architectural Design Services
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or is not on PATH.
  echo Install Node.js LTS from https://nodejs.org/ and open this file again.
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  echo Installing website dependencies for the first run...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)
echo Starting C + D website. Keep this window open while testing.
call npm run dev
pause
