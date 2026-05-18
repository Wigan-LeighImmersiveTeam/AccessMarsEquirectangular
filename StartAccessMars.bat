@echo off
cd /d "%~dp0"

start "" cmd /k "npm run start"

timeout /t 8 /nobreak >nul

start "" "http://localhost:3002"

exit