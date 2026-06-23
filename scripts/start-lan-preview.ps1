#requires -Version 5.1

<#
.SYNOPSIS
  启动 0619作业 UI 开发服务器
.DESCRIPTION
  启动 Python http.server 并绑定到 127.0.0.1（默认）或 0.0.0.0（加 -Lan）。
  端口被占用时自动递增。
.PARAMETER Port
  起始端口（默认 8000），被占用会自动找下一个空闲端口。
.PARAMETER Lan
  绑定到 0.0.0.0 以允许局域网其他设备访问（可能触发 Windows 防火墙弹窗）。
.PARAMETER NoOpen
  不自动打开浏览器。
.EXAMPLE
  .\scripts\start-lan-preview.ps1           # 127.0.0.1:8000
  .\scripts\start-lan-preview.ps1 3000      # 127.0.0.1:3000
  .\scripts\start-lan-preview.ps1 -Lan      # 0.0.0.0:8000
  .\scripts\start-lan-preview.ps1 -Lan -NoOpen  # 不打开浏览器
#>

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateRange(1, 65535)]
    [int]$Port = 8000,

    [switch]$Lan,
    [switch]$NoOpen
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $ProjectRoot

# ── 找 Python ──────────────────────────────
$pythonPath = $null
foreach ($candidate in @('py', 'python', 'python3')) {
    $cmd = Get-Command -Name $candidate -ErrorAction SilentlyContinue
    if ($null -ne $cmd) {
        $pythonPath = $cmd.Source
        break
    }
}
if (-not $pythonPath) {
    throw 'Python 3 未找到。请安装 Python 3 并确保它在 PATH 中。'
}

# ── 找空闲端口 ────────────────────────────
$originalPort = $Port
while ($Port -le 65535) {
    $inUse = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    if (-not $inUse) { break }
    $Port++
}
if ($Port -gt 65535) {
    throw "端口范围已耗尽（起始端口 $originalPort），无法启动。"
}
if ($Port -ne $originalPort) {
    Write-Host "端口 $originalPort 已被占用，已自动切换到端口 $Port" -ForegroundColor Yellow
}

# ── 检测 LAN IPv4 地址 ────────────────────
$lanAddress = $null
if ($Lan) {
    # 跳过虚拟/隧道接口的关键词
    $skipPatterns = @('Hyper-V', 'WSL', 'Bluetooth', 'VPN', 'Tunnel', 'MHM')
    $interfaces = Get-NetIPConfiguration -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPv4DefaultGateway -and
            $_.IPv4Address -and
            $_.InterfaceAlias -notmatch ($skipPatterns -join '|')
        }
    foreach ($iface in $interfaces) {
        $addr = $iface.IPv4Address.IPAddress
        if ($addr -and $addr -notmatch '^169\.254\.') {
            $lanAddress = $addr
            break
        }
    }
    $bindIp = '0.0.0.0'
} else {
    $bindIp = '127.0.0.1'
}

# ── 启动 ────────────────────────────────────
$Host.UI.RawUI.WindowTitle = "0619作业 UI — 端口 $Port"
Write-Host ''
Write-Host ' >>>  0619作业 UI — 开发服务器' -ForegroundColor Green
Write-Host ''
Write-Host " 本地地址    http://localhost:$Port/"
if ($Lan) {
    $lanMsg = if ($lanAddress) { "$lanAddress" } else { '无法检测局域网 IP，请用 ipconfig 查看' }
    Write-Host " 局域网地址  http://${lanMsg}:$Port/" -ForegroundColor Cyan
    Write-Host ''
    Write-Host ' ⚠ 绑定到 0.0.0.0，防火墙可能弹出提示，请允许。' -ForegroundColor Yellow
}
Write-Host ''
Write-Host ' 按 Ctrl+C 停止服务器' -ForegroundColor DarkGray
Write-Host ''

if (-not $NoOpen) {
    Start-Process "http://localhost:$Port/"
}

# 用 $pythonPath 的目录 + python.exe 启动
$pythonDir = Split-Path -Parent $pythonPath
$pythonExe = Join-Path -Path $pythonDir -ChildPath 'python.exe'
& $pythonExe -m http.server $Port --bind $bindIp
exit $LASTEXITCODE
