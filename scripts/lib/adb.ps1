#requires -Version 5.1
# ASMC4 ADB discovery, wireless connection, and pairing helpers.

function Invoke-Adb {
    param(
        [Parameter(Mandatory)]
        [string[]]$Command,
        [string]$DeviceId = ''
    )

    $adbCmd = @($Command | Where-Object { $_ -ne $null -and "$_" -ne '' })
    if ($adbCmd.Count -eq 0) {
        throw 'Invoke-Adb: 缺少 adb 命令参数。'
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

    Write-Host "[WARN] 多个 adb 设备，使用 $($Devices[0])。"
    return $Devices[0]
}

function Resolve-AdbDevices {
    $devices = @(Get-AdbReadyDevices)
    if ($devices.Count -eq 0) { return $null }
    if ($devices.Count -eq 1) { return $devices[0] }

    $preferred = Select-PreferredAdbDevice -Devices $devices
    foreach ($serial in $devices) {
        if ($serial -ne $preferred) {
            Write-Host "  [Adb]  断开重复设备: $serial"
            Invoke-Adb -Command @('disconnect', $serial) | Out-Null
        }
    }
    return $preferred
}

function Test-AdbConnectOk {
    param($Result)

    $text = ($Result.Output -join ' ').ToLower()
    if ($text -match 'failed|cannot|unable|error:') { return $false }
    return $Result.ExitCode -eq 0 -or $text -match 'connected to|already connected'
}

function Set-AdbWirelessConfig {
    param([string]$Address)

    $current = Get-ConfigProp (Get-DevDeviceConfig) 'adbWireless'
    if ($current -eq $Address) { return }

    Update-DevDeviceConfig -Updates @{ adbWireless = $Address }
    Write-Host "  [Adb]  已保存 adbWireless -> $Address"
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
            Write-Host "  [Adb]  正在无线连接 $Address ..."
        } else {
            Write-Host "  [Adb]  重试连接 $attempt/$MaxAttempts ..."
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
        Write-Host "  [Adb]  mdns 无线: $($mdnsAddrs -join ', ')"
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

function Ensure-AdbDevice {
    param(
        [switch]$AllowMissing,
        [switch]$Quiet
    )

    if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
        throw '未找到 adb。请安装 Android Platform-Tools 并加入 PATH。'
    }

    Invoke-Adb -Command @('start-server') | Out-Null

    $picked = Resolve-AdbDevices
    if ($picked) {
        Write-Host "  [Adb]  设备就绪: $picked"
        return $picked
    }

    $wireless = Get-AdbWirelessAddress

    if ($wireless -or @(Wait-AdbMdnsConnectAddresses -MaxWaitSec 1).Count -gt 0) {
        Connect-AdbWirelessAuto | Out-Null
        $picked = Resolve-AdbDevices
        if ($picked) {
            Write-Host "  [Adb]  设备就绪: $picked"
            return $picked
        }
    }

    $hint = if ($wireless) {
        '无线连接失败。请保持无线调试开启、重新配对一次，或插入 USB。'
    } else {
        '未找到设备。请插入 USB、开启无线调试，或在 scripts/dev-device.local.json 中设置 adbWireless（参考 dev-device.example.json）。'
    }

    if ($AllowMissing) {
        if (-not $Quiet) { Write-Host "[WARN] $hint" }
        return $null
    }
    throw $hint
}

function Test-AdbReverseOk {
    param($Result)

    $text = ($Result.Output -join ' ').ToLower()
    if ($text -match 'failed|cannot|unable|error:') { return $false }
    return $Result.ExitCode -eq 0
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

function Test-AdbAvailable {
    if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
        Write-Host '  [FAIL] 未找到 adb。请安装 Android Platform-Tools 并加入 PATH。' -ForegroundColor Red
        return $false
    }
    return $true
}

function Get-AdbUsbDevices {
    $result = Invoke-Adb -Command @('devices', '-l')
    $usb = @()
    foreach ($line in ($result.Output | Select-Object -Skip 1)) {
        if ($line -match '^\s*(\S+)\s+device\b') {
            $usb += $Matches[1]
        }
    }
    return $usb
}

function Get-AdbDeviceIp {
    $result = Invoke-Adb -Command @('shell', 'ip', 'addr', 'show', 'wlan0')
    $ipLine = $result.Output -split "`n" | Select-String 'inet\s+(\d+\.\d+\.\d+\.\d+)'
    if ($ipLine) {
        return $ipLine.Matches.Groups[1].Value
    }

    $result = Invoke-Adb -Command @('shell', 'ip', 'addr', 'show')
    $ipLine = $result.Output -split "`n" | Select-String 'inet\s+(\d+\.\d+\.\d+\.\d+)' | Where-Object { $_ -notmatch '127\.0\.0\.' }
    if ($ipLine) {
        return $ipLine.Matches.Groups[1].Value
    }
    return $null
}

function Invoke-AdbPairSwitchUsb {
    Write-Host ''
    Write-Host '  === USB 转 TCPIP 无线模式 ===' -ForegroundColor Cyan

    $devices = Get-AdbUsbDevices
    if ($devices.Count -eq 0) {
        Write-Host '  [FAIL] 未连接 USB 设备。' -ForegroundColor Red
        return $false
    }

    $serial = $devices[0]
    Write-Host "  发现 USB 设备: $serial" -ForegroundColor Green

    Write-Host '  正在检测 Wi-Fi IP...'
    $ip = Get-AdbDeviceIp
    if (-not $ip) {
        Write-Host '  无法从设备读取 Wi-Fi IP。' -ForegroundColor Yellow
        $ip = Read-Host '  请输入手机 IP（设置 -> WLAN 中查看）'
        if (-not $ip) { return $false }
    } else {
        Write-Host "  设备 Wi-Fi IP: $ip" -ForegroundColor Green
    }

    Write-Host '  正在将 adbd 切换到 TCPIP 端口 5555...'
    $result = Invoke-Adb -DeviceId $serial -Command @('tcpip', '5555')
    foreach ($line in $result.Output) {
        if ($line) { Write-Host "         $line" }
    }
    if ($result.ExitCode -ne 0) {
        Write-Host '  [FAIL] tcpip 命令失败。' -ForegroundColor Red
        return $false
    }

    Start-Sleep -Seconds 3

    $addr = "${ip}:5555"
    Write-Host "  正在连接 $addr ..."
    $result = Invoke-Adb -Command @('connect', $addr)
    foreach ($line in $result.Output) {
        if ($line) { Write-Host "         $line" }
    }

    Start-Sleep -Seconds 2
    $ready = Get-AdbUsbDevices
    $connected = $ready -contains $addr -or $ready -contains $ip
    if ($connected) {
        Write-Host "  [OK] 无线 adb 已连接: $addr" -ForegroundColor Green
        $save = Read-Host "  保存 '$addr' 到 dev-device.local.json？(Y/n)"
        if ($save -ne 'n') { Set-AdbWirelessConfig -Address $addr }
        return $true
    }

    Write-Host "  [WARN] 连接结束，请用 adb devices 确认。" -ForegroundColor Yellow
    return $false
}

function Invoke-AdbPairTls {
    Write-Host ''
    Write-Host '  === Android 11+ 无线调试配对 ===' -ForegroundColor Cyan
    Write-Host ''
    Write-Host '  在手机上：'
    Write-Host '  1. 设置 -> 开发者选项 -> 无线调试 -> 开启'
    Write-Host '  2. 点「使用配对码配对设备」'
    Write-Host '  3. 在下方输入手机显示的 IP:端口 和 6 位配对码'
    Write-Host ''

    $pairAddr = Read-Host '  配对 IP:端口（来自手机）'
    if (-not $pairAddr) { return $false }

    $code = Read-Host '  6 位配对码'
    if (-not $code) { return $false }

    Write-Host "  正在配对 $pairAddr ..."
    $result = Invoke-Adb -Command @('pair', $pairAddr, $code)
    foreach ($line in $result.Output) {
        if ($line) { Write-Host "         $line" }
    }

    if ($result.ExitCode -ne 0 -or ($result.Output -join ' ') -match 'failed|error|already') {
        Write-Host '  [FAIL] 配对失败，请检查 IP:端口 和配对码。' -ForegroundColor Red
        return $false
    }

    Write-Host '  [OK] 配对成功！' -ForegroundColor Green

    $connectAddr = Read-Host '  连接 IP:端口（配对后手机显示，通常同 IP 不同端口）'
    if (-not $connectAddr) { return $false }

    Write-Host "  正在连接 $connectAddr ..."
    $result = Invoke-Adb -Command @('connect', $connectAddr)
    foreach ($line in $result.Output) {
        if ($line) { Write-Host "         $line" }
    }

    Start-Sleep -Seconds 2
    $ready = Get-AdbUsbDevices
    $connected = $ready -contains $connectAddr -or $ready -contains ($connectAddr -replace ':\d+$', '')
    if ($connected) {
        Write-Host "  [OK] 无线 adb 已连接: $connectAddr" -ForegroundColor Green
        $save = Read-Host "  保存 '$connectAddr' 到 dev-device.local.json？(Y/n)"
        if ($save -ne 'n') { Set-AdbWirelessConfig -Address $connectAddr }
        return $true
    }

    Write-Host '  [WARN] 连接结束，请用 adb devices 确认。' -ForegroundColor Yellow
    return $false
}

function Invoke-AdbPairConnect {
    Write-Host ''
    Write-Host '  === 连接无线 adb ===' -ForegroundColor Cyan

    $addr = Read-Host '  输入 IP:端口（如 192.168.1.42:5555）'
    if (-not $addr) { return $false }

    Write-Host "  正在连接 $addr ..."
    $result = Invoke-Adb -Command @('connect', $addr)
    foreach ($line in $result.Output) {
        if ($line) { Write-Host "         $line" }
    }

    Start-Sleep -Seconds 2
    $ready = Get-AdbUsbDevices
    $connected = $ready -contains $addr -or $ready -contains ($addr -replace ':\d+$', '')
    if ($connected) {
        Write-Host "  [OK] 无线 adb 已连接: $addr" -ForegroundColor Green
        $save = Read-Host "  保存 '$addr' 到 dev-device.local.json？(Y/n)"
        if ($save -ne 'n') { Set-AdbWirelessConfig -Address $addr }
        return $true
    }

    Write-Host '  [FAIL] 连接失败，请检查 IP:端口 和手机无线调试。' -ForegroundColor Red
    return $false
}

function Show-AdbWirelessStatus {
    Write-Host ''
    Write-Host '  === 当前状态 ===' -ForegroundColor Cyan

    if (-not (Test-AdbAvailable)) { return }

    $result = Invoke-Adb -Command @('devices', '-l')
    $hasDevice = $false
    foreach ($line in ($result.Output | Select-Object -Skip 1)) {
        if ($line -match '^\s*(\S+)\s+(\S+)') {
            $hasDevice = $true
            Write-Host "  设备: $($Matches[1])  状态: $($Matches[2])" -ForegroundColor Green
        }
    }
    if (-not $hasDevice) {
        Write-Host '  未连接设备。' -ForegroundColor Yellow
    }

    $wireless = Get-AdbWirelessAddress
    if ($wireless) {
        Write-Host "  已保存 adbWireless: $wireless" -ForegroundColor DarkGray
    }

    $mdns = Invoke-Adb -Command @('mdns', 'services')
    if ($mdns.Output.Count -gt 1) {
        Write-Host '  发现 mDNS 服务:' -ForegroundColor DarkGray
        foreach ($line in ($mdns.Output | Select-Object -Skip 1)) {
            if ($line) { Write-Host "    $line" -ForegroundColor DarkGray }
        }
    }
}

function Show-AdbWirelessMenu {
    if (-not (Test-AdbAvailable)) { return $false }

    Write-Host ''
    Write-Host '  无线 adb 配对' -ForegroundColor Green
    Write-Host '  ---------------------------------'
    Write-Host '  1  查看状态'
    Write-Host '  2  配对设备（Android 11+ 无线调试）'
    Write-Host '  3  连接 IP:端口'
    Write-Host '  4  USB 转 TCPIP 无线模式'
    Write-Host ''
    $pick = Read-Host '  选择 1-4（回车退出）'
    switch ($pick.Trim()) {
        '1' { Show-AdbWirelessStatus; return $true }
        '2' { Invoke-AdbPairTls; return $true }
        '3' { Invoke-AdbPairConnect; return $true }
        '4' { Invoke-AdbPairSwitchUsb; return $true }
        default { return $false }
    }
}
