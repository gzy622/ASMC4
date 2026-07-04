#requires -Version 5.1
param(
    [Parameter(Mandatory)]
    [ValidateRange(1, 65535)]
    [int]$Port
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

try { chcp 65001 | Out-Null } catch {}
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$ruleName = "ASMC4 Dev $Port"
if (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue) {
    Write-Host '  [FW] 防火墙规则已存在'
    exit 0
}

Write-Host "  [FW] 添加防火墙规则 TCP $Port"
New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Any | Out-Null
Write-Host '  [FW] 防火墙规则已添加'
exit 0
