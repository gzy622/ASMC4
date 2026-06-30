#Requires -Version 5.1
<#
  ASMC4 Wireless ADB Helper — enable / pair / connect.

  Usage:
    .\scripts\adb-wireless.ps1             interactive menu
    .\scripts\adb-wireless.ps1 -Pair        pair with Android 11+ wireless debugging
    .\scripts\adb-wireless.ps1 -Connect     connect to a known IP:port
    .\scripts\adb-wireless.ps1 -SwitchUsb   switch USB device to TCPIP mode
#>

param(
    [switch]$Pair,
    [switch]$Connect,
    [switch]$SwitchUsb,
    [switch]$ShowStatus
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$ConfigPath  = Join-Path $ProjectRoot 'scripts/dev-device.local.json'

function Read-Utf8Text {
    param([string]$Path)
    return [System.IO.File]::ReadAllText($Path, [System.Text.UTF8Encoding]::new($false))
}

function Write-Utf8Text {
    param([string]$Path, [string]$Content)
    [System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($false))
}

function Write-Step {
    param([string]$Msg, [string]$Color = 'Gray')
    Write-Host "  [$($Color)..$([char]0x1b)[0m] $Msg" -ForegroundColor $Color
}

function Invoke-Adb {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$AdbArgs)

    $oldEap = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    try {
        $output = & adb @AdbArgs 2>&1
        $code = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 0 }
        return [pscustomobject]@{
            Output   = @($output | ForEach-Object { "$_" })
            ExitCode = $code
        }
    } finally {
        $ErrorActionPreference = $oldEap
    }
}

function Test-AdbAvailable {
    if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
        Write-Host "  [FAIL] adb not found. Install Android Platform-Tools and add adb to PATH." -ForegroundColor Red
        return $false
    }
    return $true
}

function Get-UsbDevices {
    $result = Invoke-Adb devices -l
    $usb = @()
    foreach ($line in ($result.Output | Select-Object -Skip 1)) {
        if ($line -match '^\s*(\S+)\s+device\b') {
            $usb += $Matches[1]
        }
    }
    return $usb
}

function Get-DeviceIp {
    $result = Invoke-Adb shell ip addr show wlan0
    $ipLine = $result.Output -split "`n" | Select-String 'inet\s+(\d+\.\d+\.\d+\.\d+)'
    if ($ipLine) {
        return $ipLine.Matches.Groups[1].Value
    }
    # fallback: try other interfaces
    $result = Invoke-Adb shell ip addr show
    $ipLine = $result.Output -split "`n" | Select-String 'inet\s+(\d+\.\d+\.\d+\.\d+)' | Where-Object { $_ -notmatch '127\.0\.0\.' }
    if ($ipLine) {
        return $ipLine.Matches.Groups[1].Value
    }
    return $null
}

function Save-WirelessConfig {
    param([string]$Address)

    $cfg = @{}
    if (Test-Path $ConfigPath) {
        try { $cfg = Read-Utf8Text $ConfigPath | ConvertFrom-Json } catch {}
    }

    $cfg | Add-Member -NotePropertyName 'adbWireless' -NotePropertyValue $Address -Force

    $json = $cfg | ConvertTo-Json
    Write-Utf8Text -Path $ConfigPath -Content $json
    Write-Step "Saved to $ConfigPath" -Color Green
}

function Do-SwitchUsb {
    Write-Host "`n  === Switch USB device to TCPIP mode ===" -ForegroundColor Cyan

    $devices = Get-UsbDevices
    if ($devices.Count -eq 0) {
        Write-Host "  [FAIL] No USB device connected." -ForegroundColor Red
        return $false
    }

    $serial = $devices[0]
    Write-Step "Found USB device: $serial" -Color Green

    Write-Step 'Checking Wi-Fi IP...'
    $ip = Get-DeviceIp
    if (-not $ip) {
        Write-Step 'Could not detect Wi-Fi IP from device.' -Color Yellow
        $ip = Read-Host '  Enter device IP address (from phone Wi-Fi settings)'
        if (-not $ip) { return $false }
    } else {
        Write-Step "Device Wi-Fi IP: $ip" -Color Green
    }

    Write-Step "Setting adbd to TCPIP mode on port 5555..."
    $result = Invoke-Adb -s $serial tcpip 5555
    foreach ($line in $result.Output) {
        if ($line) { Write-Host "         $line" }
    }
    if ($result.ExitCode -ne 0) {
        Write-Host "  [FAIL] tcpip command failed." -ForegroundColor Red
        return $false
    }

    Start-Sleep -Seconds 3

    $addr = "${ip}:5555"
    Write-Step "Connecting to $addr ..."
    $result = Invoke-Adb connect $addr
    foreach ($line in $result.Output) {
        if ($line) { Write-Host "         $line" }
    }

    # verify
    Start-Sleep -Seconds 2
    $ready = Get-UsbDevices
    $connected = $ready -contains $addr -or $ready -contains $ip
    if ($connected) {
        Write-Host "  [PASS] Wireless ADB connected: $addr" -ForegroundColor Green
        $save = Read-Host "  Save '$addr' to dev-device.local.json? (Y/n)"
        if ($save -ne 'n') { Save-WirelessConfig -Address $addr }
        return $true
    } else {
        Write-Host "  [WARN] Connection attempt finished. Verify with 'adb devices'." -ForegroundColor Yellow
        return $false
    }
}

function Do-Pair {
    Write-Host "`n  === Pair with Android 11+ Wireless Debugging ===" -ForegroundColor Cyan
    Write-Host "`n  On your phone:"
    Write-Host "  1. Settings -> Developer options -> Wireless debugging -> Enable"
    Write-Host "  2. Tap 'Pair device with pairing code'"
    Write-Host "  3. Enter the IP:port and 6-digit code below`n"

    $pairAddr = Read-Host '  Pairing IP:port (from phone)'
    if (-not $pairAddr) { return $false }

    $code = Read-Host '  6-digit pairing code'
    if (-not $code) { return $false }

    Write-Step "Pairing with $pairAddr ..."
    $result = Invoke-Adb pair $pairAddr $code
    foreach ($line in $result.Output) {
        if ($line) { Write-Host "         $line" }
    }

    if ($result.ExitCode -ne 0 -or ($result.Output -join ' ') -match 'failed|error|already') {
        Write-Host "  [FAIL] Pairing failed. Check IP:port and code." -ForegroundColor Red
        return $false
    }

    Write-Host "  [PASS] Paired successfully!" -ForegroundColor Green

    # After pairing, the device will also show its connect IP:port
    $connectAddr = Read-Host "`n  Connect IP:port (usually same IP, different port — shown on phone after pairing)"
    if (-not $connectAddr) { return $false }

    Write-Step "Connecting to $connectAddr ..."
    $result = Invoke-Adb connect $connectAddr
    foreach ($line in $result.Output) {
        if ($line) { Write-Host "         $line" }
    }

    Start-Sleep -Seconds 2
    $ready = Get-UsbDevices
    $connected = $ready -contains $connectAddr -or $ready -contains ($connectAddr -replace ':\d+$', '')
    if ($connected) {
        Write-Host "  [PASS] Wireless ADB connected: $connectAddr" -ForegroundColor Green
        $save = Read-Host "  Save '$connectAddr' to dev-device.local.json? (Y/n)"
        if ($save -ne 'n') { Save-WirelessConfig -Address $connectAddr }
        return $true
    } else {
        Write-Host "  [WARN] Connection attempt finished. Verify with 'adb devices'." -ForegroundColor Yellow
        return $false
    }
}

function Do-Connect {
    Write-Host "`n  === Connect to Wireless ADB ===" -ForegroundColor Cyan

    $addr = Read-Host '  Enter IP:port (e.g. 192.168.1.42:5555)'
    if (-not $addr) { return $false }

    Write-Step "Connecting to $addr ..."
    $result = Invoke-Adb connect $addr
    foreach ($line in $result.Output) {
        if ($line) { Write-Host "         $line" }
    }

    Start-Sleep -Seconds 2
    $ready = Get-UsbDevices
    $connected = $ready -contains $addr -or $ready -contains ($addr -replace ':\d+$', '')
    if ($connected) {
        Write-Host "  [PASS] Wireless ADB connected: $addr" -ForegroundColor Green
        $save = Read-Host "  Save '$addr' to dev-device.local.json? (Y/n)"
        if ($save -ne 'n') { Save-WirelessConfig -Address $addr }
        return $true
    } else {
        Write-Host "  [FAIL] Connection failed. Check IP:port and phone wireless debugging." -ForegroundColor Red
        return $false
    }
}

function Show-Status {
    Write-Host "`n  === Current Status ===" -ForegroundColor Cyan

    # adb available?
    if (-not (Test-AdbAvailable)) { return }

    # devices
    $result = Invoke-Adb devices -l
    $hasDevice = $false
    foreach ($line in ($result.Output | Select-Object -Skip 1)) {
        if ($line -match '^\s*(\S+)\s+(\S+)') {
            $hasDevice = $true
            Write-Host "  Device: $($Matches[1])  state: $($Matches[2])" -ForegroundColor Green
        }
    }
    if (-not $hasDevice) {
        Write-Host "  No devices connected." -ForegroundColor Yellow
    }

    # saved config
    if (Test-Path $ConfigPath) {
        $cfg = Read-Utf8Text $ConfigPath | ConvertFrom-Json
        $wireless = $cfg.PSObject.Properties['adbWireless']
        if ($wireless -and $wireless.Value) {
            Write-Host "  Saved adbWireless: $($wireless.Value)" -ForegroundColor DarkGray
        }
    }

    # mdns
    $mdns = Invoke-Adb mdns services
    if ($mdns.Output.Count -gt 1) {
        Write-Host "  mDNS services found:" -ForegroundColor DarkGray
        foreach ($line in ($mdns.Output | Select-Object -Skip 1)) {
            if ($line) { Write-Host "    $line" -ForegroundColor DarkGray }
        }
    }
}

function Show-Menu {
    Write-Host "`n  ASMC4 Wireless ADB Setup" -ForegroundColor Green
    Write-Host '  ---------------------------------'
    Write-Host '  1  Show status'
    Write-Host '  2  Pair device (Android 11+ Wireless debugging)'
    Write-Host '  3  Connect to IP:port'
    Write-Host '  4  Switch USB device to TCPIP (wireless) mode'
    Write-Host ''
    $pick = Read-Host '  Select 1-4 (or Enter to exit)'
    switch ($pick.Trim()) {
        '1' { Show-Status; return $true }
        '2' { Do-Pair; return $true }
        '3' { Do-Connect; return $true }
        '4' { Do-SwitchUsb; return $true }
        default { return $false }
    }
}

# --- main ---
try { chcp 65001 | Out-Null } catch {}
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding

if (-not (Test-AdbAvailable)) { exit 1 }

if ($ShowStatus) {
    Show-Status
} elseif ($Pair) {
    Do-Pair
} elseif ($Connect) {
    Do-Connect
} elseif ($SwitchUsb) {
    Do-SwitchUsb
} else {
    while (Show-Menu) { }
}
