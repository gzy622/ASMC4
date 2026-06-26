@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

rem --- Parse args ---
set PORT=8000
set NO_OPEN=0

:parse_args
if "%~1"=="" goto :done_parse
if /i "%~1"=="--no-open" set NO_OPEN=1 & shift & goto :parse_args
set PORT=%~1
shift
goto :parse_args
:done_parse

rem --- Check adb ---
where adb >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] adb not found. Install Android Platform-Tools and add it to your PATH.
    pause
    exit /b 1
)

rem --- Check connected device ---
adb get-state >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] No Android device detected via adb.
    echo         Enable USB debugging on the phone and authorize this PC, then retry.
    pause
    exit /b 1
)

rem --- Initial build ---
echo   [Build] Bundling JS ^& CSS via esbuild...
call node build.mjs
if %errorlevel% neq 0 (
    echo [ERROR] Build failed. Check the error messages above.
    pause
    exit /b %errorlevel%
)

rem --- Background watch for auto-rebuild ---
echo   [Watch] Auto-rebuild active. Refresh browser to see changes.
for /f "tokens=1" %%i in ('powershell -NoProfile -Command "try { $p=Start-Process -FilePath node -ArgumentList 'build.mjs','--watch' -WindowStyle Hidden -PassThru; $p.Id } catch { Write-Output -1 }"') do set WATCH_PID=%%i
if "!WATCH_PID!"=="-1" (
    echo   [WARN] Watch failed to start. Run manually: node build.mjs --watch
    set WATCH_PID=
)

rem --- Check Python ---
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python 3 not found. Install Python and add it to your PATH.
    pause
    exit /b 1
)

rem --- Find free port ---
:find_port
netstat -an 2>nul | findstr /C:"LISTENING" | findstr /C:":%PORT% " >nul
if !errorlevel! equ 0 (
    set /a PORT=!PORT!+1
    if !PORT! gtr 65535 (
        echo [ERROR] No available port found.
        pause
        exit /b 1
    )
    goto :find_port
)

rem --- adb reverse ---
echo   [Adb]   Forwarding device port %PORT% -^> host port %PORT%...
adb reverse tcp:%PORT% tcp:%PORT% >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] adb reverse failed. Check USB connection and debugging authorization.
    if defined WATCH_PID taskkill /pid !WATCH_PID! /f >nul 2>&1
    pause
    exit /b 1
)

rem --- Set title ---
title ASMC4 USB -- Port %PORT%

set "TARGET_URL=http://localhost:%PORT%/"

echo.
echo   ^>^>^>  ASMC4 -- USB Dev Server
echo.
echo   Phone     %TARGET_URL%
echo.
echo   NOTE: Open this URL in the phone browser.
echo         No Wi-Fi needed; traffic stays over USB.
echo.
echo   Press Ctrl+C to stop the server
echo.

python -m http.server %PORT% --bind 127.0.0.1 --directory dist
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Server exited abnormally. Check port %PORT%.
    pause
)

rem --- Cleanup: remove adb reverse + stop background watch ---
adb reverse --remove tcp:%PORT% >nul 2>&1
if defined WATCH_PID (
    taskkill /pid !WATCH_PID! /f >nul 2>&1
    echo   [Watch] Background node process stopped.
)

exit /b %errorlevel%