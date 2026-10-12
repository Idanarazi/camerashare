@echo off
title PicMe app over the internet (keep this window open)
cd /d "%~dp0app"
where node >nul 2>nul || (echo Node.js is not installed. Get the LTS version from nodejs.org, then run this again. & pause & exit /b)
echo Checking the app tools. The first time takes a few minutes...
call npm install --no-audit --no-fund --loglevel=error
echo.
echo  Works even when the phone is on a different network. A bit slower to load.
echo  If it asks to install @expo/ngrok, type Y and press Enter.
echo  Then scan the QR code below with your iPhone camera.
echo.
call npx expo start --tunnel
pause
