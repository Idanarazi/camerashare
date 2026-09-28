@echo off
title PicMe server
cd /d "%~dp0"
rem Stop an older PicMe server still using port 3000 (double-clicking again = restart)
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >NUL 2>&1
timeout /t 1 /nobreak >NUL
if not exist node_modules\express-rate-limit call npm install
call npm start
pause
