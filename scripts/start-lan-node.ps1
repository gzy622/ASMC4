#requires -Version 5.1

param(
    [ValidateRange(1, 65535)]
    [int]$Port = 8000
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
Set-Location -LiteralPath $ProjectRoot

# --- Check admin ---
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host '[INFO] Need admin rights for firewall rule. Requesting elevation...'
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = 'powershell.exe'
    $psi.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Port $Port"
    $psi.Verb = 'runas'
    $psi.UseShellExecute = $true
    $psi.WorkingDirectory = $ProjectRoot
    [System.Diagnostics.Process]::Start($psi) | Out-Null
    exit
}

# --- Firewall rule ---
$ruleName = "ASMC4 Dev $Port"
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if (-not $existing) {
    Write-Host "  [FW] Adding firewall rule - allow port $Port"
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Any | Out-Null
} else {
    Write-Host "  [FW] Firewall rule already exists"
}

# --- Build ---
Write-Host '  [Build] Building JS and CSS...'
node build.mjs
if ($LASTEXITCODE -ne 0) { throw 'Build failed' }

# --- Watch ---
Write-Host '  [Watch] Auto-rebuild active...'
$watchProcess = Start-Process -FilePath node -ArgumentList 'build.mjs', '--watch' -WindowStyle Hidden -PassThru

# --- Get LAN IP ---
$lanIP = $null
$ifaces = Get-NetIPConfiguration -ErrorAction SilentlyContinue | Where-Object {
    $_.IPv4DefaultGateway -and $_.IPv4Address
}
$skip = 'Hyper-V|WSL|Bluetooth|VPN|Tunnel|MHM|Virtual|Loopback'
foreach ($iface in $ifaces) {
    $addr = $iface.IPv4Address.IPAddress
    if ($addr -and ($addr -notmatch '^169\.254\.') -and ($iface.InterfaceAlias -notmatch $skip)) {
        $lanIP = $addr
        break
    }
}

# --- Title ---
$Host.UI.RawUI.WindowTitle = "ASMC4 - Port $Port"

Write-Host ''
Write-Host '  >>>  ASMC4 - Dev Server' -ForegroundColor Green
Write-Host ''
Write-Host "  Local     http://localhost:$Port/"
if ($lanIP) {
    Write-Host "  LAN       http://${lanIP}:$Port/" -ForegroundColor Cyan
}
Write-Host ''
Write-Host '  Press Ctrl+C to stop' -ForegroundColor DarkGray
Write-Host ''

try {
    node scripts/serve.mjs $Port
} finally {
    if ($watchProcess -and !$watchProcess.HasExited) {
        $watchProcess.Kill()
    }
}