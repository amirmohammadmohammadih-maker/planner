@echo off
setlocal
title Planner - rebuild
cd /d "%~dp0"
REM Run this after you change the code (non-Docker setup). Then start with run-windows.bat.
if not exist ".env.local" echo DATABASE_URL=pglite://./data> .env.local
set "DATABASE_URL=pglite://./data"
call npm install
if errorlevel 1 goto :fail
call npm run build
if errorlevel 1 goto :fail
echo.
echo Build finished. Now double-click run-windows.bat
pause
exit /b 0
:fail
echo.
echo [ERROR] Build failed - read the message above.
pause
exit /b 1
