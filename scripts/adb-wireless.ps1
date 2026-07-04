#Requires -Version 5.1
<#
  ASMC4 无线 adb 辅助 — 配对 / 连接 / 状态。

  用法:
    .\scripts\adb-wireless.ps1             交互菜单
    .\scripts\adb-wireless.ps1 -Pair
    .\scripts\adb-wireless.ps1 -Connect
    .\scripts\adb-wireless.ps1 -SwitchUsb
    .\scripts\adb-wireless.ps1 -ShowStatus

  也可: dev.cmd pair 或 dev 菜单 7
#>

param(
    [switch]$Pair,
    [switch]$Connect,
    [switch]$SwitchUsb,
    [switch]$ShowStatus
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

try { chcp 65001 | Out-Null } catch {}
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding

. (Join-Path $PSScriptRoot 'lib.ps1')

if (-not (Test-AdbAvailable)) { exit 1 }

if ($ShowStatus) {
    Show-AdbWirelessStatus
} elseif ($Pair) {
    Invoke-AdbPairTls
} elseif ($Connect) {
    Invoke-AdbPairConnect
} elseif ($SwitchUsb) {
    Invoke-AdbPairSwitchUsb
} else {
    while (Show-AdbWirelessMenu) { }
}
