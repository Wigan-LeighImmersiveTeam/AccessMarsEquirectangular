@echo off
title Access Mars First Time Setup
cd /d "%~dp0"

set "LOGFILE=%~dp0setup-log.txt"

echo ============================================ > "%LOGFILE%"
echo Access Mars First Time Setup >> "%LOGFILE%"
echo ============================================ >> "%LOGFILE%"

echo ============================================
echo Access Mars First Time Setup
echo ============================================
echo.

set "NODE_DIR=%~dp0portable-node8"
set "NODE_ZIP=%TEMP%\node-v8.17.0-win-x64.zip"
set "NODE_EXTRACT=%TEMP%\accessmars-node8-extract"
set "NODE_URL=https://nodejs.org/download/release/v8.17.0/node-v8.17.0-win-x64.zip"

echo Removing old portable Node folders...
if exist "%NODE_DIR%" rmdir /s /q "%NODE_DIR%"
if exist "%NODE_EXTRACT%" rmdir /s /q "%NODE_EXTRACT%"

echo Downloading portable Node.js 8.17.0...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%NODE_ZIP%'" >> "%LOGFILE%" 2>&1

echo Extracting Node.js...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '%NODE_ZIP%' -DestinationPath '%NODE_EXTRACT%' -Force" >> "%LOGFILE%" 2>&1

echo Copying Node.js into project folder...
xcopy "%NODE_EXTRACT%\node-v8.17.0-win-x64\*" "%NODE_DIR%\" /E /I /Y >> "%LOGFILE%" 2>&1

if not exist "%NODE_DIR%\node.exe" (
    echo ERROR: portable Node was not copied correctly.
    pause
    exit /b 1
)

set "PATH=%NODE_DIR%;%NODE_DIR%\node_modules\npm\bin;%~dp0node_modules\.bin;%PATH%"

echo.
echo Using Node:
"%NODE_DIR%\node.exe" -v

echo Using npm:
call "%NODE_DIR%\npm.cmd" -v

echo.
echo Cleaning old install...
if exist node_modules rmdir /s /q node_modules

echo Installing project dependencies with portable Node 8...
call "%NODE_DIR%\npm.cmd" install

echo.
echo Checking node-sass...
if exist "node_modules\.bin\node-sass.cmd" (
    echo SUCCESS: node-sass is installed.
) else (
    echo node-sass missing. Installing node-sass manually...
    call "%NODE_DIR%\npm.cmd" install node-sass@4.5.3 --save-dev
)

if exist "node_modules\.bin\node-sass.cmd" (
    echo.
    echo ============================================
    echo Setup complete.
    echo You can now run StartAccessMars.bat
    echo ============================================
) else (
    echo.
    echo ERROR: node-sass is still missing.
)

pause