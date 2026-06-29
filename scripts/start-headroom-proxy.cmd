@echo off
setlocal
cd /d "%~dp0.."

set PORT=8787
where headroom >nul 2>&1
if errorlevel 1 (
  echo [FAIL] headroom not in PATH. Install: pip install headroom-ai
  exit /b 1
)

echo Starting Headroom proxy on port %PORT% ...
echo Logs: %USERPROFILE%\.headroom\logs\proxy.log
echo.
echo Configure Cursor (optional, uses your own API keys):
echo   Settings ^> Models ^> Override OpenAI Base URL:
echo     http://127.0.0.1:%PORT%/p/ASMC4/v1
echo   Anthropic Base URL:
echo     http://127.0.0.1:%PORT%/p/ASMC4
echo.
echo Press Ctrl+C to stop.
headroom proxy --port %PORT%
