@echo off
title Sign in to Expo
cd /d "%~dp0app"
echo Sign in with your Expo account (free, make one at expo.dev/signup if you do not have one).
echo Type your username or email, press Enter, then your password. The password stays hidden while you type.
echo.
call npx expo login
echo.
call npx expo whoami
echo.
echo If your name shows above, you are signed in. Now sign in to Expo Go on your iPhone with the same account,
echo then close the old app window and run start-app.bat again.
pause
