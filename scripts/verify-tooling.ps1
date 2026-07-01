#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$fail = 0

function Pass($msg) { Write-Host "  [PASS] $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red; $script:fail++ }
function Warn($msg) { Write-Host "  [WARN] $msg" -ForegroundColor Yellow }

Write-Host "`nASMC4 tooling verify (multi-agent / Windows)`n"

# Templates (OpenCode / Reasonix)
$tplOc = Join-Path $Root 'agent-templates\opencode.json'
if (Test-Path $tplOc) { Pass 'agent-templates present (OpenCode/Reasonix)' } else { Fail 'missing agent-templates/' }

# RTK
if (Get-Command rtk -ErrorAction SilentlyContinue) {
  Pass "rtk in PATH ($((rtk --version 2>&1 | Select-Object -First 1)))"
} else { Fail 'rtk not in PATH' }

# Headroom
if (Get-Command headroom -ErrorAction SilentlyContinue) {
  Pass "headroom in PATH ($((headroom --version 2>&1 | Select-Object -First 1)))"
  try {
    Invoke-WebRequest -Uri 'http://127.0.0.1:8787/health' -UseBasicParsing -TimeoutSec 2 | Out-Null
    Pass 'headroom proxy :8787 (optional API layer)'
  } catch {
    Warn 'headroom proxy not running (optional; scripts\start-headroom-proxy.cmd)'
  }
} else { Fail 'headroom not in PATH' }

# Optional local Cursor rules (gitignored; AGENTS.md is the project default)
$toolingRule = Join-Path $Root '.cursor\rules\tooling-stack.mdc'
if (Test-Path $toolingRule) { Pass 'local .cursor/rules/tooling-stack.mdc' }
else { Warn 'optional: tooling-stack.mdc via setup-agent-local.ps1' }

# OpenCode local
if ((Test-Path (Join-Path $Root 'opencode.json')) -and (Test-Path (Join-Path $Root '.opencode\plugins\ponytail.mjs'))) {
  Pass 'OpenCode local config'
} else { Warn 'OpenCode: run setup-agent-local.ps1' }

# Reasonix local
if (Test-Path (Join-Path $Root 'reasonix.toml')) { Pass 'reasonix.toml (local)' } else { Warn 'Reasonix: run setup-agent-local.ps1' }

# No always-rtk in .cursorrules
$cr = Join-Path $Root '.cursorrules'
if (Test-Path $cr) {
  if ((Get-Content $cr -Raw) -match 'always prefix with `rtk`') { Fail '.cursorrules has Headroom always-rtk' }
  else { Pass '.cursorrules conflict-free' }
}

# Local Cursor rules/skills must be tracked (not gitignored)
Push-Location $Root
try {
  $tracked = git ls-files .cursor 2>$null
  if ($tracked.Count -ge 1) { Pass ".cursor tracked in git ($($tracked.Count) files)" }
  else { Fail '.cursor/ not tracked — pull latest' }
  $ignored = git check-ignore -q .cursor/user-rules-slim.txt 2>$null; $LASTEXITCODE
  if ($LASTEXITCODE -eq 0) { Fail '.cursor/ is gitignored — remove from .gitignore' }
  else { Pass '.cursor/ not gitignored' }
} finally { Pop-Location }

# Git must not track machine-local agent paths
Push-Location $Root
try {
  $bad = git ls-files .cursorrules opencode.json reasonix.toml 2>$null
  if ($bad) { Fail "machine-local files tracked: $($bad -join ', ')" }
  else { Pass 'machine-local agent paths not in git index' }
} finally { Pop-Location }

# Waza (user)
$waza = Join-Path $env:USERPROFILE '.agents\skills'
foreach ($w in @('hunt','check','think','design','read','write')) {
  if (Test-Path (Join-Path $waza "$w\SKILL.md")) { Pass "waza: $w" } else { Warn "waza: $w missing" }
}

Push-Location $Root
try {
  python verify.py 2>&1 | Out-Null
  if ($LASTEXITCODE -eq 0) { Pass 'python verify.py' } else { Fail 'python verify.py' }
} finally { Pop-Location }

Write-Host ""
if ($fail -eq 0) {
  Write-Host 'Overall: PASSED' -ForegroundColor Green
  exit 0
} else {
  Write-Host "Overall: FAILED ($fail blocking)" -ForegroundColor Red
  exit 1
}
