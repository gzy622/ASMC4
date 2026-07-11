#Requires -Version 5.1
<#
.SYNOPSIS
  生成本机 Agent 配置（Reasonix / .cursorrules stub）。
  Cursor 规则与技能在 .cursor/（已纳入 Git），无需由此脚本生成。
#>
param(
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$Tpl = Join-Path $Root 'agent-templates'

if (-not (Test-Path $Tpl)) {
  Write-Error "missing agent-templates/ at $Tpl"
}

Write-Host "`nASMC4 setup-agent-local (Windows)`n"

# Cursor: project guidance in AGENTS.md + .cursor/ (tracked)
$cursorDir = Join-Path $Root '.cursor'
if (Test-Path $cursorDir) {
  Write-Host "  [ok] Cursor: AGENTS.md + .cursor/ (in repo)"
} else {
  Write-Warning "  [warn] missing .cursor/ — pull latest"
}

# Reasonix
$rxTpl = Join-Path $Tpl 'reasonix.toml.example'
$rxOut = Join-Path $Root 'reasonix.toml'
if ($Force -or -not (Test-Path $rxOut)) {
  Copy-Item $rxTpl $rxOut -Force
  Write-Host "  [ok] Reasonix: reasonix.toml"
} else {
  Write-Host "  [skip] reasonix.toml exists (use -Force)"
}

Copy-Item (Join-Path $Tpl 'cursorrules.stub') (Join-Path $Root '.cursorrules') -Force
Write-Host "  [ok] .cursorrules stub"

Write-Host "`nCodex: 全局 ponytail 插件 + AGENTS.md"
Write-Host "Done. Run: powershell -File scripts\verify-tooling.ps1`n"
