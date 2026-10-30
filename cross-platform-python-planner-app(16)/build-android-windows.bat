@echo off
setlocal
title Planner - build Android APK
cd /d "%~dp0"

REM ---------------------------------------------------------------
REM  Builds the Android app (APK).
REM  The app works OFFLINE: it carries its own database, data stays on the phone.
REM  (Optionally it can connect to a server later from Settings inside the app.)
REM  Requirements: Node.js + Android Studio (installed once, with its SDK).
REM ---------------------------------------------------------------

echo.
echo  Planner - Android APK builder
echo  Project folder: %cd%
echo.

where node >nul 2>nul
if errorlevel 1 goto :nonode

if exist "node_modules\next\package.json" goto :havedeps
echo [1/6] Installing project packages - first time only, a few minutes...
call npm install
if errorlevel 1 goto :fail
goto :prep
:havedeps
echo [1/6] Project packages already installed.

:prep
echo [1/6] Building the mobile app (offline, data stays on the phone) - 1-3 minutes...
set "NEXT_TELEMETRY_DISABLED=1"
call node "packaging\capacitor\prepare.js"
if errorlevel 1 goto :fail

echo [2/6] Installing Capacitor...
call npm install --no-save --no-audit --no-fund @capacitor/core@latest @capacitor/android@latest @capacitor/cli@latest @capacitor/assets@latest
if errorlevel 1 goto :fail

if exist "android\" goto :sync
echo [3/6] Creating the Android project...
call npx cap add android
if errorlevel 1 goto :fail
goto :aftersync
:sync
echo [3/6] Android project exists - syncing.
:aftersync
call npx cap sync android
if errorlevel 1 goto :fail

echo [4/6] Generating app icons...
call npx capacitor-assets generate --android --iconBackgroundColor "#047857" --iconBackgroundColorDark "#064e3b" --splashBackgroundColor "#f6f8f4" --splashBackgroundColorDark "#0b0e0d" >nul 2>nul

echo [5/6] Looking for Android SDK and Java...
set "SDK=%ANDROID_HOME%"
if "%SDK%"=="" set "SDK=%ANDROID_SDK_ROOT%"
if "%SDK%"=="" if exist "%LOCALAPPDATA%\Android\Sdk\platforms" set "SDK=%LOCALAPPDATA%\Android\Sdk"
set "JDK=%JAVA_HOME%"
if "%JDK%"=="" if exist "%ProgramFiles%\Android\Android Studio\jbr\bin\java.exe" set "JDK=%ProgramFiles%\Android\Android Studio\jbr"
if "%JDK%"=="" if exist "%LOCALAPPDATA%\Programs\Android Studio\jbr\bin\java.exe" set "JDK=%LOCALAPPDATA%\Programs\Android Studio\jbr"
if "%SDK%"=="" goto :studio
if "%JDK%"=="" goto :studio

set "SDKFWD=%SDK:\=/%"
> "android\local.properties" echo sdk.dir=%SDKFWD%
set "JAVA_HOME=%JDK%"
set "PATH=%JDK%\bin;%PATH%"
echo        SDK:  %SDK%
echo        Java: %JDK%

echo [6/6] Building APK with Gradle (first time 5-15 minutes, downloads ~500 MB)...
cd android
call gradlew.bat assembleDebug --no-daemon
set "RC=%errorlevel%"
cd ..
if not "%RC%"=="0" goto :gradlefail

if not exist "packaging\android-output" mkdir "packaging\android-output"
copy /y "android\app\build\outputs\apk\debug\app-debug.apk" "packaging\android-output\Planner.apk" >nul
echo.
echo  DONE.  APK:  %cd%\packaging\android-output\Planner.apk
echo  Send it to your phone (Telegram / cable) and install it.
echo.
start "" "%cd%\packaging\android-output"
pause
exit /b 0

:studio
echo.
echo  Android SDK / Java not found automatically - opening Android Studio instead.
echo  In Android Studio:  Build  ^>  Build App Bundle(s) / APK(s)  ^>  Build APK(s)
echo  Output: android\app\build\outputs\apk\debug\app-debug.apk
echo  (Install Android Studio from https://developer.android.com/studio if it is missing.)
echo.
call npx cap open android
pause
exit /b 0

:gradlefail
echo.
echo [ERROR] Gradle build failed - read the message above.
echo   * "SDK location not found" / licenses  -> open Android Studio once: File ^> Settings ^> Android SDK, install Android 14/15 SDK
echo   * download / timeout errors            -> check internet / VPN and run again
echo   * still failing                        -> run: npx cap open android   and build from Android Studio
pause
exit /b 1

:nonode
echo [ERROR] Node.js is not installed. Get the LTS version from https://nodejs.org
pause
exit /b 1

:fail
echo.
echo [ERROR] Something failed - read the message above and send its full text.
pause
exit /b 1
