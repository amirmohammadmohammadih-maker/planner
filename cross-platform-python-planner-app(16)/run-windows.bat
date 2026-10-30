@echo off
setlocal
title Planner - local server
cd /d "%~dp0"

REM ---------------------------------------------------------------
REM  Double-click to run the planner on this computer WITHOUT Docker.
REM  Data is stored in the "data" folder next to this file.
REM  (If you already use Docker, you do not need this file.)
REM ---------------------------------------------------------------

where node >nul 2>nul
if errorlevel 1 goto :nonode

if not exist ".env.local" echo DATABASE_URL=pglite://./data> .env.local
set "DATABASE_URL=pglite://./data"
if "%PORT%"=="" set "PORT=3000"

if exist "node_modules\next\package.json" goto :havedeps
echo [1/3] Installing packages - first time only, this can take a few minutes...
call npm install
if errorlevel 1 goto :fail
goto :checkbuild

:havedeps
echo [1/3] Packages already installed.

:checkbuild
if exist ".next\BUILD_ID" goto :havebuild
echo [2/3] Building the app - first time only, 1-3 minutes...
call npm run build
if errorlevel 1 goto :fail
goto :serve

:havebuild
echo [2/3] App already built.

:serve
echo.
echo [3/3] Starting the server at http://localhost:%PORT%
echo       Keep this window open. Close it to stop the server.
echo.
start "" cmd /c "timeout /t 6 >nul & start "" http://localhost:%PORT%"
call npm start
pause
exit /b 0

:nonode
echo [ERROR] Node.js is not installed. Get the LTS version from https://nodejs.org
pause
exit /b 1

:fail
echo.
echo [ERROR] Something went wrong - read the message above.
echo         If a download failed, run this once and try again:
echo             npm config set registry https://registry.npmmirror.com
pause
exit /b 1
