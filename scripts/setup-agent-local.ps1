#Requires -Version 5.1
<#
.SYNOPSIS
  从 agent-templates/ 生成本机 Agent 配置（Cursor / OpenCode / Reasonix）。
  生成物均在 .gitignore，不会进入 GitHub。
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

function Copy-Tree($src, $dst) {
  if (-not (Test-Path $src)) { return }
  New-Item -ItemType Directory -Force -Path $dst | Out-Null
  Copy-Item -Path (Join-Path $src '*') -Destination $dst -Recurse -Force
}

Write-Host "`nASMC4 setup-agent-local (Windows)`n"

# Cursor
$cursorRules = Join-Path $Root '.cursor\rules'
$cursorSkills = Join-Path $Root '.cursor\skills'
Copy-Tree (Join-Path $Tpl 'cursor\rules') $cursorRules
Copy-Tree (Join-Path $Tpl 'cursor\skills') $cursorSkills
Copy-Item (Join-Path $Tpl 'cursorrules.stub') (Join-Path $Root '.cursorrules') -Force
Write-Host "  [ok] Cursor: .cursor/rules, .cursor/skills, .cursorrules"

# OpenCode
$ocJson = Join-Path $Root 'opencode.json'
$ocPlug = Join-Path $Root '.opencode\plugins'
if ($Force -or -not (Test-Path $ocJson)) {
  Copy-Item (Join-Path $Tpl 'opencode.json') $ocJson -Force
  Write-Host "  [ok] OpenCode: opencode.json"
} else {
  Write-Host "  [skip] opencode.json exists (use -Force to overwrite)"
}
New-Item -ItemType Directory -Force -Path $ocPlug | Out-Null
$mjs = Join-Path $Tpl 'opencode\plugins\ponytail.mjs'
if (Test-Path $mjs) {
  Copy-Item $mjs (Join-Path $ocPlug 'ponytail.mjs') -Force
  Write-Host "  [ok] OpenCode: .opencode/plugins/ponytail.mjs"
} else {
  Write-Warning "  [warn] missing template opencode/plugins/ponytail.mjs"
}

# Reasonix
$rxTpl = Join-Path $Tpl 'reasonix.toml.example'
$rxOut = Join-Path $Root 'reasonix.toml'
if ($Force -or -not (Test-Path $rxOut)) {
  Copy-Item $rxTpl $rxOut -Force
  Write-Host "  [ok] Reasonix: reasonix.toml (from example)"
} else {
  Write-Host "  [skip] reasonix.toml exists (use -Force to overwrite)"
}

Write-Host "`nCodex: 使用全局 ponytail 插件 + 仓库 AGENTS.md（无需本脚本写入文件）"
Write-Host "Done. Run: powershell -File scripts\verify-tooling.ps1`n"
