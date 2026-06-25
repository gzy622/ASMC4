@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

rem --- Parse args ---
set PORT=8000
set LAN_MODE=0
set NO_OPEN=0

:parse_args
if "%~1"=="" goto :done_parse
if /i "%~1"=="--lan" set LAN_MODE=1 & shift & goto :parse_args
if /i "%~1"=="--no-open" set NO_OPEN=1 & shift & goto :parse_args
set PORT=%~1
shift
goto :parse_args
:done_parse

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

rem --- Set title ---
title ASMC4 -- Port %PORT%

set "TARGET_URL=http://localhost:%PORT%/"

echo.
echo   ^>^>^>  ASMC4 -- Dev Server
echo.
echo   Local     %TARGET_URL%
if "%LAN_MODE%"=="1" (
    set BIND=0.0.0.0
    echo   LAN       http://YOUR-IP:%PORT%/
    echo.
    echo   NOTE: Binding to 0.0.0.0 may trigger Windows Firewall.
) else (
    set BIND=127.0.0.1
)
echo.
echo   Press Ctrl+C to stop the server
echo.

python -m http.server %PORT% --bind %BIND% --directory dist
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Server exited abnormally. Check port %PORT%.
    pause
)

rem --- Cleanup: stop background watch ---
if defined WATCH_PID (
    taskkill /pid !WATCH_PID! /f >nul 2>&1
    echo   [Watch] Background node process stopped.
)

exit /b %errorlevel%
