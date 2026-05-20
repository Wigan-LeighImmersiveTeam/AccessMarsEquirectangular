@echo off
title Access Mars Launcher
cd /d "%~dp0"

set "NODE_DIR=%~dp0portable-node8"
set "PATH=%NODE_DIR%;%NODE_DIR%\node_modules\npm\bin;%~dp0node_modules\.bin;%PATH%"

if not exist "%NODE_DIR%\node.exe" (
    echo Portable Node 8 is missing.
    echo Run First Time Setup.bat first.
    pause
    exit /b 1
)

if not exist "node_modules\.bin\node-sass.cmd" (
    echo node-sass is missing.
    echo Run First Time Setup.bat again.
    pause
    exit /b 1
)

echo Starting Access Mars server...
start "" cmd /k "cd /d "%~dp0" && set "PATH=%NODE_DIR%;%NODE_DIR%\node_modules\npm\bin;%~dp0node_modules\.bin;%PATH%" && "%NODE_DIR%\npm.cmd" run start"

echo Waiting for server to start...
timeout /t 8 /nobreak >nul

echo Opening controller window...
start "" "http://localhost:3002"

echo Waiting for controller window to fully load...
timeout /t 6 /nobreak >nul

echo Opening CAVE output window...
start "" "http://localhost:3002/?caveOutput=1"

exit