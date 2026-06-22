@echo off
setlocal

cd /d "%~dp0"

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.
    pause
    exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-lan-preview.ps1" %*

if %errorlevel% neq 0 (
    echo.
    echo Preview server failed to start.
    pause
    exit /b %errorlevel%
)

exit /b 0

