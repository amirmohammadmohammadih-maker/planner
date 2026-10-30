@echo off
setlocal
title Planner - build Windows EXE
cd /d "%~dp0"

REM ---------------------------------------------------------------
REM  Double-click to build the Windows app (.exe).
REM  The EXE is self-contained: it bundles the planner server and an
REM  embedded database. No Docker needed on the target computer.
REM  (Inside the app, Ctrl + , lets you switch to a remote server.)
REM ---------------------------------------------------------------

echo.
echo  Planner - Windows EXE builder
echo  Project folder: %cd%
echo.

where node >nul 2>nul
if errorlevel 1 goto :nonode

REM Mirrors in case the default downloads are slow or blocked.
set "ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/"
set "ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/"
set "CSC_IDENTITY_AUTO_DISCOVERY=false"
set "NEXT_TELEMETRY_DISABLED=1"
set "DATABASE_URL=pglite://./data"

if exist "node_modules\next\package.json" goto :havedeps
echo [1/6] Installing project packages - first time only, a few minutes...
call npm install
if errorlevel 1 goto :fail
goto :build

:havedeps
echo [1/6] Project packages already installed.

:build
echo [2/6] Building the web app - 1-3 minutes...
call npm run build
if errorlevel 1 goto :fail

echo [3/6] Assembling the embedded server...
call node "packaging\electron\prepare-server.js"
if errorlevel 1 goto :fail

cd /d "%~dp0packaging\electron"

echo [4/6] Preparing app icon...
if not exist "icon.png" copy /y "..\..\public\icons\icon-256.png" "icon.png" >nul 2>&1
if exist "icon.png" call node make-icon.js
if exist "icon.ico" goto :iconok
echo        icon not available - building with the default Electron icon.
call node -e "const f='package.json',j=JSON.parse(require('fs').readFileSync(f));delete j.build.win.icon;j.build.files=j.build.files.filter(x=>!x.startsWith('icon'));require('fs').writeFileSync(f,JSON.stringify(j,null,2))"
:iconok

if exist "%LOCALAPPDATA%\electron-builder\Cache\winCodeSign" rd /s /q "%LOCALAPPDATA%\electron-builder\Cache\winCodeSign" >nul 2>&1

if exist "node_modules\electron\dist\electron.exe" goto :haveelectron
echo [5/6] Downloading Electron - first time only, 100-200 MB...
call npm install
if errorlevel 1 goto :fail
goto :pack

:haveelectron
echo [5/6] Electron already installed.

:pack
echo [6/6] Building installer - 1-3 minutes...
call npm run dist:win
if errorlevel 1 goto :fail

echo.
echo  DONE. Your files are in:  %cd%\dist
echo        - Planner-1.1.0-win-x64.exe   = installer
echo        - Planner-1.1.0-portable.exe  = no install needed
echo.
echo  After installing, just open "Planner" from the Start menu.
echo  No Docker needed. Your data is kept in %%APPDATA%%\planner-desktop\data
echo.
start "" "%cd%\dist"
pause
exit /b 0

:nonode
echo [ERROR] Node.js is not installed. Get the LTS version from https://nodejs.org
pause
exit /b 1

:fail
echo.
echo [ERROR] Build failed - read the message above and send its full text.
echo         Download errors: check internet / VPN and run this file again.
echo.
pause
exit /b 1
