#Requires -Version 5.1
<#
.SYNOPSIS
  生成本机 Agent 配置（OpenCode / Reasonix / .cursorrules stub）。
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

# Cursor: tracked in .cursor/ — only verify
$rule = Join-Path $Root '.cursor\rules\ponytail.mdc'
if (Test-Path $rule) {
  Write-Host "  [ok] Cursor: .cursor/rules + .cursor/skills (in repo)"
} else {
  Write-Warning "  [warn] missing .cursor/rules — pull latest or restore from git"
}

# OpenCode
$ocJson = Join-Path $Root 'opencode.json'
$ocPlug = Join-Path $Root '.opencode\plugins'
if ($Force -or -not (Test-Path $ocJson)) {
  Copy-Item (Join-Path $Tpl 'opencode.json') $ocJson -Force
  Write-Host "  [ok] OpenCode: opencode.json"
} else {
  Write-Host "  [skip] opencode.json exists (use -Force)"
}
New-Item -ItemType Directory -Force -Path $ocPlug | Out-Null
$mjs = Join-Path $Tpl 'opencode\plugins\ponytail.mjs'
if (Test-Path $mjs) {
  Copy-Item $mjs (Join-Path $ocPlug 'ponytail.mjs') -Force
  Write-Host "  [ok] OpenCode: .opencode/plugins/ponytail.mjs"
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
