@echo off
title Access Mars Launcher
cd /d "%~dp0"

echo Starting Access Mars server...
start "" cmd /k "npm run start"

echo Waiting for server to start...
timeout /t 8 /nobreak >nul

echo Opening controller window...
start "" "http://localhost:3002"

timeout /t 6 /nobreak >nul

echo Opening CAVE output window...
start "" "http://localhost:3002/?caveOutput=1"

exit