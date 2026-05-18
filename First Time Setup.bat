@echo off
title Access Mars First Time Setup
cd /d "%~dp0"

echo ============================================
echo Access Mars First Time Setup
echo ============================================
echo.

set REQUIRED_NODE=v8.17.0

where node >nul 2>nul
if %errorlevel% neq 0 goto installnode

for /f %%i in ('node -v') do set CURRENT_NODE=%%i

if /I "%CURRENT_NODE%"=="%REQUIRED_NODE%" goto installpackages

echo Wrong Node version detected: %CURRENT_NODE%
echo Required version: %REQUIRED_NODE%
goto installnode

:installnode
echo.
echo Installing Node.js 8.17.0...
echo.

powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/download/release/v8.17.0/node-v8.17.0-x64.msi' -OutFile '%TEMP%\node8.msi'"

start /wait msiexec /i "%TEMP%\node8.msi" /quiet /norestart

set PATH=%PATH%;C:\Program Files\nodejs

echo.
echo Node installed.
echo.

:installpackages
echo Installing project dependencies...
echo.

call npm install

echo.
echo ============================================
echo Setup complete.
echo You can now run StartAccessMars.bat
echo ============================================
pause