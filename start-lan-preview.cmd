@echo off
setlocal

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-lan-preview.ps1" %*

if errorlevel 1 (
    echo.
    echo Preview server failed to start.
    pause
)

