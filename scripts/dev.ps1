#requires -Version 5.1
<#
  ASMC4 unified preview: Web (PC / LAN / adb) + Android app.

  Usage:
    dev.ps1                          interactive menu
    dev.ps1 -Surface web -Target pc
    dev.ps1 -Surface web -Target lan
    dev.ps1 -Surface web -Target adb
    dev.ps1 -Surface android
    dev.ps1 -Surface full -Target pc|lan|adb   Web + Android, one window
    dev.ps1 -Surface apk

  In-session keys: B=rebuild dist, R=rebuild+install Android, Q=quit
  Wireless daily: menu 6 then LAN (2) for phone Web; R for Android install.

  adb: always Invoke-Adb -Command @('...'); never positional Invoke-Adb devices.

  Legacy: -Mode pc|lan|usb maps to web + matching target.

  Wireless adb: dev.ps1 auto-connects via adb mdns when Wireless debugging is on.
  Optional dev-device.local.json adbWireless pins host / fallback when mdns is unavailable.
#>

param(
    [ValidateSet('web', 'android', 'apk', 'full', '')]
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
    param(
        [Parameter(Mandatory)]
        [string[]]$Command,
        [string]$DeviceId = ''
    )

    $adbCmd = @($Command | Where-Object { $_ -ne $null -and "$_" -ne '' })
    if ($adbCmd.Count -eq 0) {
        throw 'Invoke-Adb: missing adb command arguments.'
    }

    $invokeArgs = @()
    if ($DeviceId) { $invokeArgs += '-s', $DeviceId }
    $invokeArgs += $adbCmd

    $oldEap = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    try {
        $output = & adb @invokeArgs 2>&1
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

function Test-LooksLikeAdbSerial {
    param([string]$Serial)

    if ($Serial -match '(?i)list all|copy local|remove this|print offline|detach') { return $false }
    if ($Serial -match '^\d+\.\d+\.\d+\.\d+:\d+$') { return $true }
    if ($Serial -match '^adb-') { return $true }
    if ($Serial -match '^\S{1,128}$') { return $true }
    return $false
}

function Get-AdbReadyDevices {
    if (-not (Get-Command adb -ErrorAction SilentlyContinue)) { return @() }

    $result = Invoke-Adb -Command @('devices')
    $ready = @()
    foreach ($line in ($result.Output | Select-Object -Skip 1)) {
        if ($line -match '^\s*(.+?)\s+device\s*$') {
            $serial = $Matches[1].Trim()
            if (Test-LooksLikeAdbSerial -Serial $serial) {
                $ready += $serial
            }
        }
    }
    return $ready
}

function Get-AdbDeviceEntries {
    if (-not (Get-Command adb -ErrorAction SilentlyContinue)) { return @() }

    $result = Invoke-Adb -Command @('devices')
    $entries = @()
    foreach ($line in ($result.Output | Select-Object -Skip 1)) {
        if ($line -match '^\s*(.+?)\s+(device|offline|unauthorized)\s*$') {
            $serial = $Matches[1].Trim()
            if (Test-LooksLikeAdbSerial -Serial $serial) {
                $entries += [pscustomobject]@{
                    Serial = $serial
                    State  = $Matches[2]
                }
            }
        }
    }
    return $entries
}

function Select-PreferredAdbDevice {
    param([string[]]$Devices)

    $wireless = Get-AdbWirelessAddress
    if ($wireless) {
        $exact = @($Devices | Where-Object { $_ -eq $wireless })
        if ($exact.Count -gt 0) { return $exact[0] }

        $hostPart = ($wireless -split ':')[0]
        $byHost = @($Devices | Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+:\d+$' -and $_.StartsWith("${hostPart}:") })
        if ($byHost.Count -gt 0) { return $byHost[0] }
    }

    $ipDevices = @($Devices | Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+:\d+$' })
    if ($ipDevices.Count -eq 1) { return $ipDevices[0] }

    Write-Host "[WARN] Multiple adb devices; using $($Devices[0])."
    return $Devices[0]
}

function Resolve-AdbDevices {
    $devices = @(Get-AdbReadyDevices)
    if ($devices.Count -eq 0) { return $null }
    if ($devices.Count -eq 1) { return $devices[0] }

    $preferred = Select-PreferredAdbDevice -Devices $devices
    foreach ($serial in $devices) {
        if ($serial -ne $preferred) {
            Write-Host "  [Adb]  Disconnect duplicate: $serial"
            Invoke-Adb -Command @('disconnect', $serial) | Out-Null
        }
    }
    return $preferred
}

function Test-AdbConnectOk {
    param($Result)

    if ($Result.ExitCode -eq 0) { return $true }
    $text = ($Result.Output -join ' ').ToLower()
    return $text -match 'connected to|already connected'
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

function Get-AdbMdnsConnectAddresses {
    $result = Invoke-Adb -Command @('mdns', 'services')
    $addrs = @()
    foreach ($line in ($result.Output | Select-Object -Skip 1)) {
        $trimmed = "$line".Trim()
        if (-not $trimmed) { continue }
        if ($trimmed -match '_adb-tls-connect\._tcp\s+(\d+\.\d+\.\d+\.\d+:\d+)\s*$') {
            $addrs += $Matches[1]
        }
    }
    return @($addrs | Select-Object -Unique)
}

function Wait-AdbMdnsConnectAddresses {
    param([int]$MaxWaitSec = 5)

    $deadline = (Get-Date).AddSeconds($MaxWaitSec)
    while ((Get-Date) -lt $deadline) {
        $addrs = @(Get-AdbMdnsConnectAddresses)
        if ($addrs.Count -gt 0) { return $addrs }
        Start-Sleep -Milliseconds 500
    }
    return @(Get-AdbMdnsConnectAddresses)
}

function Set-AdbWirelessConfig {
    param([string]$Address)

    $localPath = Join-Path $ProjectRoot 'scripts/dev-device.local.json'
    $cfg = [ordered]@{}
    $current = $null
    if (Test-Path -LiteralPath $localPath) {
        try {
            $parsed = Read-Utf8Text -Path $localPath | ConvertFrom-Json
            foreach ($prop in $parsed.PSObject.Properties) {
                $cfg[$prop.Name] = $prop.Value
            }
            $current = Get-ConfigProp $parsed 'adbWireless'
        } catch {
            Write-Host "[WARN] Could not read dev-device.local.json for adbWireless update: $_"
        }
    }

    if ($current -eq $Address) { return }

    $cfg['adbWireless'] = $Address
    $json = ($cfg | ConvertTo-Json -Depth 4)
    [System.IO.File]::WriteAllText($localPath, $json, [System.Text.UTF8Encoding]::new($false))
    Write-Host "  [Adb]  Saved adbWireless -> $Address"
}

function Connect-AdbWirelessTargets {
    param(
        [string[]]$Addresses,
        [switch]$UpdateConfig
    )

    foreach ($addr in $Addresses) {
        if (-not $addr) { continue }
        if (Connect-AdbWireless -Address $addr.Trim()) {
            if ($UpdateConfig) { Set-AdbWirelessConfig -Address $addr.Trim() }
            return $true
        }
    }
    return $false
}

function Connect-AdbWirelessAuto {
    $mdnsAddrs = @(Wait-AdbMdnsConnectAddresses)
    $saved = Get-AdbWirelessAddress
    $savedHost = if ($saved) { ($saved -split ':', 2)[0] } else { $null }

    if ($mdnsAddrs.Count -gt 0) {
        Write-Host "  [Adb]  mdns wireless: $($mdnsAddrs -join ', ')"
        $ordered = @($mdnsAddrs)
        if ($savedHost) {
            $preferred = @($mdnsAddrs | Where-Object { $_.StartsWith("${savedHost}:") })
            $rest = @($mdnsAddrs | Where-Object { -not $_.StartsWith("${savedHost}:") })
            $ordered = $preferred + $rest
        }

        if (Connect-AdbWirelessTargets -Addresses $ordered -UpdateConfig) {
            return $true
        }

        if ($savedHost -and @($mdnsAddrs | Where-Object { $_.StartsWith("${savedHost}:") }).Count -gt 0) {
            return $false
        }
    }

    if ($saved) {
        return Connect-AdbWireless -Address $saved
    }

    return $false
}

function Connect-AdbWireless {
    param(
        [string]$Address,
        [int]$MaxAttempts = 3
    )

    $ready = @(Get-AdbReadyDevices)
    if ($ready -contains $Address) {
        Resolve-AdbDevices | Out-Null
        return $true
    }

    foreach ($entry in Get-AdbDeviceEntries) {
        if ($entry.State -eq 'offline') {
            Invoke-Adb -Command @('disconnect', $entry.Serial) | Out-Null
        }
    }

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        if ($attempt -eq 1) {
            Write-Host "  [Adb]  Connecting wireless $Address ..."
        } else {
            Write-Host "  [Adb]  Retry connect $attempt/$MaxAttempts ..."
            Start-Sleep -Seconds 2
        }

        $result = Invoke-Adb -Command @('connect', $Address)
        foreach ($line in $result.Output) {
            if ($line) { Write-Host "         $line" }
        }

        if (Test-AdbConnectOk -Result $result) { return $true }
        if (@(Get-AdbReadyDevices).Count -gt 0) { return $true }
    }

    return $false
}

function Ensure-AdbDevice {
    param(
        [switch]$AllowMissing,
        [switch]$Quiet
    )

    if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
        throw 'adb not found. Install Android Platform-Tools and add adb to PATH.'
    }

    Invoke-Adb -Command @('start-server') | Out-Null

    $picked = Resolve-AdbDevices
    if ($picked) {
        Write-Host "  [Adb]  Device ready: $picked"
        return $picked
    }

    $wireless = Get-AdbWirelessAddress

    if ($wireless -or @(Wait-AdbMdnsConnectAddresses -MaxWaitSec 1).Count -gt 0) {
        Connect-AdbWirelessAuto | Out-Null
        $picked = Resolve-AdbDevices
        if ($picked) {
            Write-Host "  [Adb]  Device ready: $picked"
            return $picked
        }
    }

    $hint = if ($wireless) {
        'Wireless connect failed. Keep Wireless debugging on, re-pair once, or plug USB.'
    } else {
        'No device found. Plug in USB, enable Wireless debugging, or set adbWireless in scripts/dev-device.local.json (see dev-device.example.json).'
    }

    if ($AllowMissing) {
        if (-not $Quiet) { Write-Host "[WARN] $hint" }
        return $null
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
    param(
        [int]$RulePort,
        [string]$ResumeSurface = 'web',
        [string]$ResumeTarget = 'lan'
    )

    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator
    )
    if (-not $isAdmin) {
        Write-Host '[INFO] LAN mode needs admin once for firewall. Requesting elevation...'
        $devScript = Join-Path $ProjectRoot 'scripts\dev.ps1'
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = 'powershell.exe'
        $psi.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$devScript`" -Surface $ResumeSurface -Target $ResumeTarget -Port $RulePort"
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

function Start-ServeProcess {
    param([int]$ServePort)

    return Start-Process -FilePath node -ArgumentList 'scripts/serve.mjs', "$ServePort" `
        -WorkingDirectory $ProjectRoot -WindowStyle Hidden -PassThru
}

function Stop-ServeProcess {
    param($ServeProcess)
    if ($ServeProcess -and !$ServeProcess.HasExited) { $ServeProcess.Kill() }
}

function Test-AdbReverseOk {
    param($Result)

    if ($Result.ExitCode -eq 0) { return $true }
    $text = ($Result.Output -join ' ').ToLower()
    return $text -notmatch 'error:'
}

function Set-AdbReversePort {
    param(
        [string]$DeviceId,
        [int]$Port
    )

    Invoke-Adb -DeviceId $DeviceId -Command @('reverse', '--remove', "tcp:$Port") | Out-Null
    return Invoke-Adb -DeviceId $DeviceId -Command @('reverse', "tcp:$Port", "tcp:$Port")
}

function Remove-AdbReversePort {
    param(
        [string]$DeviceId,
        [int]$Port
    )

    Invoke-Adb -DeviceId $DeviceId -Command @('reverse', '--remove', "tcp:$Port") | Out-Null
}

function Enable-WebPhoneLanFallback {
    param(
        [int]$ServePort,
        [string]$ResumeSurface,
        [string]$Reason
    )

    $lanIP = Get-LanIP
    if (-not $lanIP) {
        throw "$Reason LAN IP not detected — use menu 2 (LAN) or connect adb/USB."
    }

    Write-Host "  [WARN] $Reason" -ForegroundColor Yellow
    Write-Host "         Phone Web: http://${lanIP}:$ServePort/ (same Wi-Fi as PC)"
    Ensure-LanFirewall -RulePort $ServePort -ResumeSurface $ResumeSurface -ResumeTarget 'adb'

    return @{
        LanIP          = $lanIP
        WebPhoneViaLan = $true
    }
}

function Initialize-WebAccess {
    param(
        [string]$WebTarget,
        [int]$ServePort,
        [string]$ResumeSurface = 'web'
    )

    $useAdbReverse = $false
    $lanIP = $null
    $adbDeviceId = $null
    $webPhoneViaLan = $false

    if ($WebTarget -eq 'lan') {
        Ensure-LanFirewall -RulePort $ServePort -ResumeSurface $ResumeSurface -ResumeTarget 'lan'
        $lanIP = Get-LanIP
    }

    if ($WebTarget -eq 'adb') {
        $adbDeviceId = Ensure-AdbDevice -AllowMissing
        $ServePort = Get-FreePort -StartPort $ServePort

        if ($adbDeviceId) {
            $reverse = Set-AdbReversePort -DeviceId $adbDeviceId -Port $ServePort

            if (Test-AdbReverseOk -Result $reverse) {
                Write-Host "  [Adb]  reverse tcp:$ServePort -> host"
                $useAdbReverse = $true
            } else {
                foreach ($line in $reverse.Output) {
                    if ($line) { Write-Host "         $line" -ForegroundColor DarkYellow }
                }
                $fallback = Enable-WebPhoneLanFallback -ServePort $ServePort -ResumeSurface $ResumeSurface `
                    -Reason 'adb reverse unavailable (common on wireless adb);'
                $lanIP = $fallback.LanIP
                $webPhoneViaLan = $true
            }
        } else {
            $fallback = Enable-WebPhoneLanFallback -ServePort $ServePort -ResumeSurface $ResumeSurface `
                -Reason 'No adb device; phone Web uses LAN.'
            $lanIP = $fallback.LanIP
            $webPhoneViaLan = $true
        }
    }

    return @{
        ServePort      = $ServePort
        LanIP          = $lanIP
        UseAdbReverse  = $useAdbReverse
        AdbDeviceId    = $adbDeviceId
        WebPhoneViaLan = $webPhoneViaLan
    }
}

function Write-DevHotkeyLine {
    param(
        [bool]$WebEnabled,
        [bool]$AndroidEnabled,
        [ConsoleColor]$ForegroundColor = [ConsoleColor]::Cyan
    )

    $parts = @('B  rebuild dist')
    if ($AndroidEnabled) { $parts += 'R  rebuild + install Android' }
    $parts += 'Q  quit'
    Write-Host ('  ' + ($parts -join '    ')) -ForegroundColor $ForegroundColor
}

function Write-DevSessionBanner {
    param($Session)

    Write-Host ''
    if ($Session.WebEnabled -and $Session.AndroidEnabled) {
        Write-Host '  >>>  ASMC4 - Web + Android' -ForegroundColor Green
    } elseif ($Session.WebEnabled) {
        Write-Host '  >>>  ASMC4 - Web Preview' -ForegroundColor Green
    } else {
        Write-Host '  >>>  ASMC4 - Android App' -ForegroundColor Green
    }
    Write-Host ''

    if ($Session.WebEnabled) {
        Write-Host '  Web: save then B or refresh browser (watch runs in background).'
        Write-Host ''
        switch ($Session.WebTarget) {
            'pc' {
                Write-Host "  PC     http://localhost:$($Session.ServePort)/"
            }
            'lan' {
                Write-Host "  PC     http://localhost:$($Session.ServePort)/"
                if ($Session.LanIP) {
                    Write-Host "  Phone  http://$($Session.LanIP):$($Session.ServePort)/" -ForegroundColor Cyan
                } else {
                    Write-Host '  Phone  (LAN IP not detected)'
                }
            }
            'adb' {
                if ($Session.WebPhoneViaLan -and $Session.LanIP) {
                    Write-Host "  PC     http://localhost:$($Session.ServePort)/"
                    Write-Host "  Phone  http://$($Session.LanIP):$($Session.ServePort)/" -ForegroundColor Cyan
                    Write-Host '         (adb reverse unavailable; same Wi-Fi as PC)' -ForegroundColor DarkGray
                } else {
                    Write-Host "  Phone  http://localhost:$($Session.ServePort)/" -ForegroundColor Cyan
                }
            }
        }
        Write-Host ''
    }

    if ($Session.AndroidEnabled) {
        Write-Host '  Android: press R to rebuild, sync, and reinstall on device.'
        if (-not $Session.AndroidDeviceId) {
            Write-Host '  (No device yet — connect adb and press R)' -ForegroundColor DarkYellow
        }
        Write-Host ''
    }

    Write-DevHotkeyLine -WebEnabled $Session.WebEnabled -AndroidEnabled $Session.AndroidEnabled
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
    Write-Host '  6  Web + Android - one window (pick web access next)'
    Write-Host ''
    $pick = Read-Host '  Select 1-6'
    switch ($pick.Trim()) {
        '1' { return @{ Surface = 'web'; Target = 'pc' } }
        '2' { return @{ Surface = 'web'; Target = 'lan' } }
        '3' { return @{ Surface = 'web'; Target = 'adb' } }
        '4' { return @{ Surface = 'android'; Target = '' } }
        '5' { return @{ Surface = 'apk'; Target = '' } }
        '6' {
            Write-Host ''
            Write-Host '  Web access in this session:'
            Write-Host '  1  PC    2  LAN (Wi-Fi)    3  adb (USB / wireless)'
            $webPick = Read-Host '  Select 1-3'
            $webTarget = switch ($webPick.Trim()) {
                '1' { 'pc' }
                '2' { 'lan' }
                '3' { 'adb' }
                default { throw 'Invalid web access selection.' }
            }
            return @{ Surface = 'full'; Target = $webTarget }
        }
        default { throw 'Invalid selection.' }
    }
}

function Start-WebDev {
    param(
        [string]$WebTarget,
        [int]$ServePort
    )

    Start-DevSession -WebEnabled $true -AndroidEnabled $false -WebTarget $WebTarget -ServePort $ServePort
}

function Ensure-AndroidDeviceId {
    param($Session)

    if ($Session.AndroidDeviceId) { return $Session.AndroidDeviceId }
    $Session.AndroidDeviceId = Ensure-AdbDevice
    return $Session.AndroidDeviceId
}

function Invoke-DevRebuild {
    param($Session)

    Invoke-InitialBuild
    if ($Session.WebEnabled) {
        Write-Host '  [Web]  dist/ rebuilt — refresh the browser.' -ForegroundColor Green
    } elseif ($Session.AndroidEnabled) {
        Write-Host '  [Build] dist/ rebuilt — press R to install on device.' -ForegroundColor Green
    }
}

function Invoke-DevAndroidPush {
    param($Session)

    $device = Ensure-AndroidDeviceId -Session $Session
    Invoke-InitialBuild
    Deploy-AndroidToDevice -DeviceId $device
    Write-Host '  [Android] Updated on device.' -ForegroundColor Green
}

function Wait-DevSessionKeys {
    param($Session)

    while ($true) {
        if (-not [Console]::KeyAvailable) {
            Start-Sleep -Milliseconds 150
            continue
        }

        $key = [Console]::ReadKey($true)
        if ($key.KeyChar -match '^[qQ]$') { return }

        if ($key.KeyChar -match '^[bB]$') {
            Write-Host ''
            Write-Host '  --- Rebuild dist ---' -ForegroundColor Yellow
            try {
                Invoke-DevRebuild -Session $Session
            } catch {
                Write-Host "  [ERROR] $_" -ForegroundColor Red
            }
            Write-Host ''
            Write-DevHotkeyLine -WebEnabled $Session.WebEnabled -AndroidEnabled $Session.AndroidEnabled -ForegroundColor DarkGray
            continue
        }

        if ($key.KeyChar -match '^[rR]$' -and $Session.AndroidEnabled) {
            Write-Host ''
            Write-Host '  --- Rebuild + install Android ---' -ForegroundColor Yellow
            try {
                Invoke-DevAndroidPush -Session $Session
            } catch {
                Write-Host "  [ERROR] $_" -ForegroundColor Red
            }
            Write-Host ''
            Write-DevHotkeyLine -WebEnabled $Session.WebEnabled -AndroidEnabled $Session.AndroidEnabled -ForegroundColor DarkGray
        }
    }
}

function Start-DevSession {
    param(
        [bool]$WebEnabled,
        [bool]$AndroidEnabled,
        [string]$WebTarget = 'pc',
        [int]$ServePort = 8000
    )

    $resumeSurface = if ($WebEnabled -and $AndroidEnabled) { 'full' } elseif ($WebEnabled) { 'web' } else { 'android' }

    $session = [ordered]@{
        WebEnabled      = $WebEnabled
        AndroidEnabled  = $AndroidEnabled
        WebTarget       = $WebTarget
        ServePort       = $ServePort
        LanIP           = $null
        WebPhoneViaLan  = $false
        UseAdbReverse   = $false
        AndroidDeviceId = $null
        Watch           = $null
        Serve           = $null
    }

    if ($WebEnabled) {
        $webAccess = Initialize-WebAccess -WebTarget $WebTarget -ServePort $ServePort -ResumeSurface $resumeSurface
        $session.ServePort = $webAccess.ServePort
        $session.LanIP = $webAccess.LanIP
        $session.WebPhoneViaLan = $webAccess.WebPhoneViaLan
        $session.UseAdbReverse = $webAccess.UseAdbReverse
        if ($webAccess.AdbDeviceId) { $session.AndroidDeviceId = $webAccess.AdbDeviceId }
    }

    if ($AndroidEnabled -and -not $session.AndroidDeviceId) {
        if ($WebEnabled) {
            $session.AndroidDeviceId = Ensure-AdbDevice -AllowMissing -Quiet
            if (-not $session.AndroidDeviceId) {
                Write-Host '  [Android] No device yet — connect adb/USB, then press R.'
            }
        } else {
            $session.AndroidDeviceId = Ensure-AdbDevice
        }
    }

    Invoke-InitialBuild
    $session.Watch = Start-WatchProcess

    if ($WebEnabled) {
        $session.Serve = Start-ServeProcess -ServePort $session.ServePort
        Start-Sleep -Milliseconds 400
    }

    try {
        $androidDeployed = $false
        if ($AndroidEnabled -and $session.AndroidDeviceId) {
            try {
                Deploy-AndroidToDevice -DeviceId $session.AndroidDeviceId
                $androidDeployed = $true
            } catch {
                Write-Host "  [ERROR] $_" -ForegroundColor Red
                if (-not $WebEnabled) { throw }
                Write-Host '  [Android] Press R to retry install.' -ForegroundColor Yellow
            }
        }

        $titleParts = @()
        if ($WebEnabled) { $titleParts += "web/$WebTarget" }
        if ($AndroidEnabled) { $titleParts += 'android' }
        $titleSuffix = if ($WebEnabled) { " - $($session.ServePort)" } else { '' }
        $Host.UI.RawUI.WindowTitle = "ASMC4 $($titleParts -join '+')$titleSuffix"

        Write-DevSessionBanner -Session $session
        if ($androidDeployed) {
            Write-Host '  [Android] Installed and launched on device.'
        }

        Wait-DevSessionKeys -Session $session
    } finally {
        Stop-WatchProcess -WatchProcess $session.Watch
        Stop-ServeProcess -ServeProcess $session.Serve
        if ($session.UseAdbReverse) {
            Remove-AdbReversePort -DeviceId $session.AndroidDeviceId -Port $session.ServePort
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

function Test-GradleOk {
    param($Result)

    $text = $Result.Output -join "`n"
    if ($text -match ':app:installDebug FAILED') { return $false }
    if ($text -match 'BUILD FAILED|FAILURE: Build failed') { return $false }
    if ($text -match 'BUILD SUCCESSFUL') { return $true }
    if ($text -match 'Installed on \d+ device') { return $true }
    return $Result.ExitCode -eq 0
}

function Get-GradleFailureTail {
    param($Result)

    $lines = @($Result.Output)
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match ':app:installDebug FAILED') {
            $end = $i
            for ($j = $i + 1; $j -lt [Math]::Min($lines.Count, $i + 16); $j++) {
                $end = $j
                if ($lines[$j] -match 'BUILD FAILED|^FAILURE:') { break }
            }
            return ($lines[$i..$end] -join "`n")
        }
    }

    $hits = @($lines | Where-Object {
            $_ -match '> Task .+ FAILED' -or
            $_ -match '^FAILURE:' -or
            $_ -match 'INSTALL_FAILED' -or
            $_ -match 'Execution failed for task'
        })
    if ($hits.Count -gt 0) {
        return ($hits | Select-Object -Last 12) -join "`n"
    }
    return ($lines | Select-Object -Last 20) -join "`n"
}

function Install-AndroidDebug {
    param([string]$DeviceId)

    $resolved = Resolve-AdbDevices
    if ($resolved) { $DeviceId = $resolved }
    if (-not $DeviceId) { throw 'No adb device for installDebug.' }

    $env:ANDROID_SERIAL = $DeviceId
    try {
        Invoke-Adb -DeviceId $DeviceId -Command @('wait-for-device') | Out-Null

        Write-Host "  [Android] gradlew installDebug -> $DeviceId ..."
        $result = Invoke-Gradle installDebug

        if (-not (Test-GradleOk $result)) {
            $text = $result.Output -join "`n"
            if ($text -match 'INSTALL_FAILED_UPDATE_INCOMPATIBLE|signatures do not match') {
                Write-Host '  [Android] Signature mismatch - uninstalling old package...'
                Invoke-Adb -DeviceId $DeviceId -Command @('uninstall', $script:AndroidAppId) | Out-Null
                $result = Invoke-Gradle installDebug
            }
        }

        if (-not (Test-GradleOk $result)) {
            Write-Host '  [Android] install retry...'
            Start-Sleep -Seconds 2
            $DeviceId = Resolve-AdbDevices
            if (-not $DeviceId) { throw 'No adb device for install retry.' }
            $env:ANDROID_SERIAL = $DeviceId
            Invoke-Adb -DeviceId $DeviceId -Command @('wait-for-device') | Out-Null
            $result = Invoke-Gradle installDebug
        }

        if (-not (Test-GradleOk $result)) {
            $tail = Get-GradleFailureTail -Result $result
            throw "installDebug failed:`n$tail"
        }

        Write-Host '  [Android] installDebug ok'
    } finally {
        Remove-Item Env:ANDROID_SERIAL -ErrorAction SilentlyContinue
    }
}

function Start-AndroidApp {
    param([string]$DeviceId)

    Write-Host '  [Android] Launching app...'
    $result = Invoke-Adb -DeviceId $DeviceId -Command @(
        'shell', 'am', 'start', '-n', "$($script:AndroidAppId)/.MainActivity"
    )
    if ($result.ExitCode -ne 0) {
        throw 'Failed to launch app on device'
    }
}

function Sync-CapAndroid {
    Write-Host '  [Cap]  Syncing dist/ to android/...'
    $oldEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        npx cap sync android
        if ($LASTEXITCODE -ne 0) { throw 'cap sync failed' }
    } finally {
        $ErrorActionPreference = $oldEap
    }
}

function Deploy-AndroidToDevice {
    param([string]$DeviceId)

    Sync-CapAndroid
    Install-AndroidDebug -DeviceId $DeviceId
    Start-AndroidApp -DeviceId $DeviceId
}

function Start-AndroidDev {
    Start-DevSession -WebEnabled $false -AndroidEnabled $true
}

if (-not $Surface) {
    $picked = Show-DevMenu
    $Surface = $picked.Surface
    if ($picked.Target) { $Target = $picked.Target }
}

if ($Surface -eq 'web') {
    if (-not $Target) { $Target = 'pc' }
    Start-WebDev -WebTarget $Target -ServePort $Port
} elseif ($Surface -eq 'full') {
    if (-not $Target) { $Target = 'pc' }
    Start-DevSession -WebEnabled $true -AndroidEnabled $true -WebTarget $Target -ServePort $Port
} elseif ($Surface -eq 'android') {
    Start-AndroidDev
} elseif ($Surface -eq 'apk') {
    & (Join-Path $ProjectRoot 'scripts/build-apk.ps1')
} else {
    throw "Unknown surface: $Surface"
}
