#requires -Version 5.1
<#
  ASMC4 unified preview: Web (PC / LAN / adb) + Android app.

  Usage:
    dev.ps1                          interactive menu
    dev.ps1 -Surface web -Target pc
    dev.ps1 -Surface web -Target lan
    dev.ps1 -Surface web -Target adb
    dev.ps1 -Surface android
    dev.ps1 -Surface apk

  Legacy: -Mode pc|lan|usb maps to web + matching target.

  Wireless adb: copy scripts/dev-device.example.json to dev-device.local.json
  and set adbWireless to your phone IP:port (Developer options - Wireless debugging).
#>

param(
    [ValidateSet('web', 'android', 'apk', '')]
    [string]$Surface = '',

    [ValidateSet('pc', 'lan', 'adb', '')]
    [string]$Target = '',

    # legacy alias
    [ValidateSet('pc', 'lan', 'usb', '')]
    [string]$Mode = '',

    [ValidateRange(1, 65535)]
    [int]$Port = 8000
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

try { chcp 65001 | Out-Null } catch {}
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
Set-Location -LiteralPath $ProjectRoot

if ($Mode -and -not $Surface) {
    $Surface = 'web'
    $Target = if ($Mode -eq 'usb') { 'adb' } else { $Mode }
}

function Read-Utf8Text {
    param([string]$Path)
    return [System.IO.File]::ReadAllText($Path, [System.Text.UTF8Encoding]::new($false))
}

# adb writes info to stderr; avoid NativeCommandError under $ErrorActionPreference Stop
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

$script:AndroidAppId = 'com.gzy622.asmc4'
$script:AdbWirelessPlaceholder = '192.168.1.100:5555'

function Get-DevDeviceConfig {
    $localPath = Join-Path $ProjectRoot 'scripts/dev-device.local.json'
    if (-not (Test-Path -LiteralPath $localPath)) { return $null }

    try {
        return Read-Utf8Text -Path $localPath | ConvertFrom-Json
    } catch {
        Write-Host "[WARN] Could not parse dev-device.local.json: $_"
        return $null
    }
}

function Get-AdbReadyDevices {
    if (-not (Get-Command adb -ErrorAction SilentlyContinue)) { return @() }

    $result = Invoke-Adb devices
    $ready = @()
    foreach ($line in ($result.Output | Select-Object -Skip 1)) {
        if ($line -match '^\s*(\S+)\s+device\s*$') {
            $ready += $Matches[1]
        }
    }
    return $ready
}

function Get-ConfigProp {
    param($Cfg, [string]$Name)

    if (-not $Cfg) { return $null }
    $prop = $Cfg.PSObject.Properties[$Name]
    if (-not $prop -or $null -eq $prop.Value) { return $null }
    return [string]$prop.Value
}

function Get-AdbWirelessAddress {
    $wireless = $env:ASMC4_ADB_WIRELESS
    if (-not $wireless) {
        $cfg = Get-DevDeviceConfig
        $fromCfg = Get-ConfigProp $cfg 'adbWireless'
        if ($fromCfg) { $wireless = $fromCfg }
    }
    if (-not $wireless) { return $null }
    $wireless = $wireless.Trim()
    if (-not $wireless) { return $null }
    if ($wireless -eq $script:AdbWirelessPlaceholder) { return $null }
    return $wireless
}

function Connect-AdbWireless {
    param([string]$Address)

    Write-Host "  [Adb]  Connecting wireless $Address ..."
    $result = Invoke-Adb connect $Address
    foreach ($line in $result.Output) {
        if ($line) { Write-Host "         $line" }
    }
    Start-Sleep -Seconds 2
}

function Ensure-AdbDevice {
    if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
        throw 'adb not found. Install Android Platform-Tools and add adb to PATH.'
    }

    Invoke-Adb start-server | Out-Null

    $devices = @(Get-AdbReadyDevices)
    if ($devices.Count -gt 0) {
        Write-Host "  [Adb]  Device ready: $($devices[0])"
        return $devices[0]
    }

    $wireless = Get-AdbWirelessAddress

    if ($wireless) {
        Connect-AdbWireless -Address $wireless.Trim()
        $devices = @(Get-AdbReadyDevices)
        if ($devices.Count -gt 0) {
            Write-Host "  [Adb]  Device ready: $($devices[0])"
            return $devices[0]
        }
    }

    $hint = if ($wireless) {
        "Wireless connect to $wireless failed. Check phone wireless debugging is on and IP:port is correct in scripts/dev-device.local.json"
    } else {
        'No device found. Plug in USB, pair wireless debugging, or set adbWireless in scripts/dev-device.local.json (see dev-device.example.json).'
    }
    throw $hint
}

function Test-PortListening {
    param([int]$CheckPort)
    return [bool](netstat -an | Select-String ":$CheckPort\s" | Select-String 'LISTENING')
}

function Get-FreePort {
    param([int]$StartPort)
    $candidate = $StartPort
    while ($candidate -le 65535) {
        if (-not (Test-PortListening -CheckPort $candidate)) { return $candidate }
        $candidate++
    }
    throw 'No available port found.'
}

function Ensure-LanFirewall {
    param([int]$RulePort)

    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator
    )
    if (-not $isAdmin) {
        Write-Host '[INFO] LAN mode needs admin once for firewall. Requesting elevation...'
        $devScript = Join-Path $ProjectRoot 'scripts\dev.ps1'
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = 'powershell.exe'
        $psi.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$devScript`" -Surface web -Target lan -Port $RulePort"
        $psi.Verb = 'runas'
        $psi.UseShellExecute = $true
        $psi.WorkingDirectory = $ProjectRoot
        [System.Diagnostics.Process]::Start($psi) | Out-Null
        exit
    }

    $ruleName = "ASMC4 Dev $RulePort"
    if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
        Write-Host "  [FW] Adding firewall rule for TCP $RulePort"
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $RulePort -Action Allow -Profile Any | Out-Null
    } else {
        Write-Host '  [FW] Firewall rule already exists'
    }
}

function Get-LanIP {
    $ifaces = Get-NetIPConfiguration -ErrorAction SilentlyContinue | Where-Object {
        $_.IPv4DefaultGateway -and $_.IPv4Address
    }
    $skip = 'Hyper-V|WSL|Bluetooth|VPN|Tunnel|MHM|Virtual|Loopback'
    foreach ($iface in $ifaces) {
        $addr = $iface.IPv4Address.IPAddress
        if ($addr -and ($addr -notmatch '^169\.254\.') -and ($iface.InterfaceAlias -notmatch $skip)) {
            return $addr
        }
    }
    return $null
}

function Invoke-InitialBuild {
    Write-Host '  [Build] Building JS and CSS...'
    node build.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
}

function Start-WatchProcess {
    Write-Host '  [Watch] Auto-rebuild on save...'
    return Start-Process -FilePath node -ArgumentList 'build.mjs', '--watch' -WindowStyle Hidden -PassThru
}

function Stop-WatchProcess {
    param($WatchProcess)
    if ($WatchProcess -and !$WatchProcess.HasExited) { $WatchProcess.Kill() }
}

function Write-WebBanner {
    param([string]$WebTarget, [int]$ServePort, [string]$LanIP)

    Write-Host ''
    Write-Host '  >>>  ASMC4 - Web Preview' -ForegroundColor Green
    Write-Host ''
    Write-Host '  Refresh the browser after code changes.'
    Write-Host ''

    switch ($WebTarget) {
        'pc' {
            Write-Host "  PC     http://localhost:$ServePort/"
        }
        'lan' {
            Write-Host "  PC     http://localhost:$ServePort/"
            if ($LanIP) {
                Write-Host "  Phone  http://${LanIP}:$ServePort/" -ForegroundColor Cyan
            } else {
                Write-Host '  Phone  (LAN IP not detected)'
            }
        }
        'adb' {
            Write-Host "  Phone  http://localhost:$ServePort/" -ForegroundColor Cyan
        }
    }

    Write-Host ''
    Write-Host '  Ctrl+C to stop' -ForegroundColor DarkGray
    Write-Host ''
}

function Write-AndroidBanner {
    Write-Host ''
    Write-Host '  >>>  ASMC4 - Android App' -ForegroundColor Green
    Write-Host ''
    Write-Host '  Installs via adb (USB or wireless).'
    Write-Host '  After code changes, stop and run dev.cmd again to reinstall.'
    Write-Host ''
    Write-Host '  Ctrl+C to stop' -ForegroundColor DarkGray
    Write-Host ''
}

function Show-DevMenu {
    Write-Host ''
    Write-Host '  ASMC4 Preview' -ForegroundColor Green
    Write-Host '  ---------------------------------'
    Write-Host '  1  Web - PC'
    Write-Host '  2  Web - Phone - LAN (Wi-Fi)'
    Write-Host '  3  Web - Phone - adb (USB / wireless)'
    Write-Host '  4  Android App - adb (USB / wireless)'
    Write-Host '  5  Android APK - export to folder (remote download)'
    Write-Host ''
    $pick = Read-Host '  Select 1-5'
    switch ($pick.Trim()) {
        '1' { return @{ Surface = 'web'; Target = 'pc' } }
        '2' { return @{ Surface = 'web'; Target = 'lan' } }
        '3' { return @{ Surface = 'web'; Target = 'adb' } }
        '4' { return @{ Surface = 'android'; Target = '' } }
        '5' { return @{ Surface = 'apk'; Target = '' } }
        default { throw 'Invalid selection.' }
    }
}

function Start-WebDev {
    param(
        [string]$WebTarget,
        [int]$ServePort
    )

    $useAdbReverse = $false

    if ($WebTarget -eq 'lan') {
        Ensure-LanFirewall -RulePort $ServePort
    }

    if ($WebTarget -eq 'adb') {
        Ensure-AdbDevice | Out-Null
        $ServePort = Get-FreePort -StartPort $ServePort
        $reverse = Invoke-Adb reverse "tcp:$ServePort" "tcp:$ServePort"
        if ($reverse.ExitCode -ne 0) { throw 'adb reverse failed.' }
        Write-Host "  [Adb]  reverse tcp:$ServePort -> host"
        $useAdbReverse = $true
    }

    Invoke-InitialBuild
    $watch = Start-WatchProcess
    $lanIP = if ($WebTarget -eq 'lan') { Get-LanIP } else { $null }
    $Host.UI.RawUI.WindowTitle = "ASMC4 web/$WebTarget - $ServePort"
    Write-WebBanner -WebTarget $WebTarget -ServePort $ServePort -LanIP $lanIP

    try {
        node scripts/serve.mjs $ServePort
    } finally {
        Stop-WatchProcess -WatchProcess $watch
        if ($useAdbReverse) {
            Invoke-Adb reverse --remove "tcp:$ServePort" | Out-Null
        }
    }
}

function Invoke-Gradle {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GradleArgs)

    $oldEap = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    $androidDir = Join-Path $ProjectRoot 'android'
    try {
        Push-Location -LiteralPath $androidDir
        $output = & .\gradlew.bat @GradleArgs 2>&1
        $code = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 0 }
        return [pscustomobject]@{
            Output   = @($output | ForEach-Object { "$_" })
            ExitCode = $code
        }
    } finally {
        Pop-Location
        $ErrorActionPreference = $oldEap
    }
}

function Install-AndroidDebug {
    param([string]$DeviceId)

    if ($DeviceId) { $env:ANDROID_SERIAL = $DeviceId }
    try {
        Write-Host '  [Android] gradlew installDebug...'
        $result = Invoke-Gradle installDebug

        if ($result.ExitCode -ne 0) {
            $text = $result.Output -join "`n"
            if ($text -match 'INSTALL_FAILED_UPDATE_INCOMPATIBLE|signatures do not match') {
                Write-Host '  [Android] Signature mismatch - uninstalling old package...'
                Invoke-Adb uninstall $script:AndroidAppId | Out-Null
                $result = Invoke-Gradle installDebug
            }
        }

        if ($result.ExitCode -ne 0) {
            $tail = ($result.Output | Select-Object -Last 8) -join "`n"
            throw "installDebug failed:`n$tail"
        }

        Write-Host '  [Android] installDebug ok'
    } finally {
        Remove-Item Env:ANDROID_SERIAL -ErrorAction SilentlyContinue
    }
}

function Start-AndroidApp {
    param([string]$DeviceId)

    $adbArgs = @('shell', 'am', 'start', '-n', "$($script:AndroidAppId)/.MainActivity")
    if ($DeviceId) { $adbArgs = @('-s', $DeviceId) + $adbArgs }

    Write-Host '  [Android] Launching app...'
    $result = Invoke-Adb @adbArgs
    if ($result.ExitCode -ne 0) {
        throw 'Failed to launch app on device'
    }
}

function Start-AndroidDev {
    $device = Ensure-AdbDevice
    Invoke-InitialBuild
    $watch = Start-WatchProcess

    Write-Host '  [Cap]  Syncing dist/ to android/...'
    $oldEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        npx cap sync android
        if ($LASTEXITCODE -ne 0) { throw 'cap sync failed' }
    } finally {
        $ErrorActionPreference = $oldEap
    }

    Install-AndroidDebug -DeviceId $device
    Start-AndroidApp -DeviceId $device

    $Host.UI.RawUI.WindowTitle = 'ASMC4 android'
    Write-AndroidBanner
    Write-Host '  [Android] Installed and launched on device.'

    try {
        while ($true) { Start-Sleep -Seconds 3600 }
    } finally {
        Stop-WatchProcess -WatchProcess $watch
    }
}

if (-not $Surface) {
    $picked = Show-DevMenu
    $Surface = $picked.Surface
    if ($picked.Target) { $Target = $picked.Target }
}

if ($Surface -eq 'web') {
    if (-not $Target) { $Target = 'pc' }
    Start-WebDev -WebTarget $Target -ServePort $Port
} elseif ($Surface -eq 'android') {
    Start-AndroidDev
} elseif ($Surface -eq 'apk') {
    & (Join-Path $ProjectRoot 'scripts/build-apk.ps1')
} else {
    throw "Unknown surface: $Surface"
}
