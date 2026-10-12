@echo off
title PicMe app (keep this window open)
cd /d "%~dp0app"
where node >nul 2>nul || (echo Node.js is not installed. Get the LTS version from nodejs.org, then run this again. & pause & exit /b)
echo Checking the app tools. The first time takes a few minutes...
call npm install --no-audit --no-fund --loglevel=error
echo.
echo  1. Open Expo Go on your iPhone once, so it is installed.
echo  2. Scan the QR code below with your iPhone camera.
echo  Your iPhone must be on the same Wi-Fi as this computer.
echo  If Windows asks about the firewall, click Allow.
echo  If the phone cannot connect, close this and use start-app-anywhere.bat
echo.
call npx expo start --lan
pause
