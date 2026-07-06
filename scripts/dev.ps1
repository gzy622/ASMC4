#requires -Version 5.1
<#
  ASMC4 统一开发预览：网页（本机 / LAN / adb）+ 安卓应用。

  用法:
    dev.ps1                          交互菜单
    dev.ps1 web                      网页 LAN（默认）
    dev.ps1 web pc|lan|adb
    dev.ps1 adb                      网页 adb
    dev.ps1 android                  安卓应用 adb 安装
    dev.ps1 apk                      导出 APK
    dev.ps1 apk release              导出 release APK
    dev.ps1 pair                     无线 adb 配对
    dev.ps1 -Surface web -Target lan

  会话内热键: 1=重新构建  2=构建并安装安卓  0=退出
#>

param(
    [ValidateSet('web', 'android', 'apk', 'full', 'pair', '')]
    [string]$Surface = '',

    [ValidateSet('pc', 'lan', 'adb', 'debug', 'release', '')]
    [string]$Target = '',

    [ValidateSet('pc', 'lan', 'usb', '')]
    [string]$Mode = '',

    [ValidateRange(1, 65535)]
    [int]$Port = 8000,

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$QuickArgs
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

try { chcp 65001 | Out-Null } catch {}
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding

. (Join-Path $PSScriptRoot 'lib.ps1')
$ProjectRoot = $script:ProjectRoot
Set-Location -LiteralPath $ProjectRoot

if ($Mode -and -not $Surface) {
    $Surface = 'web'
    $Target = if ($Mode -eq 'usb') { 'adb' } else { $Mode }
}

if ($QuickArgs -and $QuickArgs.Count -ge 1 -and -not $Surface) {
    $cmd = $QuickArgs[0].ToLower()
    $arg2 = if ($QuickArgs.Count -ge 2) { $QuickArgs[1].ToLower() } else { '' }
    switch ($cmd) {
        'web' {
            $Surface = 'web'
            $Target = if ($arg2 -in @('pc', 'lan', 'adb')) { $arg2 } else { 'lan' }
        }
        'adb' { $Surface = 'web'; $Target = 'adb' }
        'android' { $Surface = 'android' }
        'apk' { $Surface = 'apk' }
        'pair' { $Surface = 'pair' }
        'pc' { $Surface = 'web'; $Target = 'pc' }
        'lan' { $Surface = 'web'; $Target = 'lan' }
        default { throw "未知命令: $cmd" }
    }
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
    throw '没有可用端口。'
}

function Test-Asmc4FirewallRule {
    param([int]$RulePort)

    $ruleName = "ASMC4 Dev $RulePort"
    return [bool](Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)
}

function Ensure-LanFirewall {
    param([int]$RulePort)

    if (Test-Asmc4FirewallRule -RulePort $RulePort) {
        Write-Host '  [FW] 防火墙规则已存在'
        return
    }

    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator
    )
    if ($isAdmin) {
        Write-Host "  [FW] 添加防火墙规则 TCP $RulePort"
        $ruleName = "ASMC4 Dev $RulePort"
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $RulePort -Action Allow -Profile Any | Out-Null
        Write-Host '  [FW] 防火墙规则已添加'
        return
    }

    Write-Host '[INFO] 需管理员权限添加防火墙规则（仅首次），正在请求提升...'
    $helper = Join-Path $ProjectRoot 'scripts\add-firewall-rule.ps1'
    $argList = "-NoProfile -ExecutionPolicy Bypass -File `"$helper`" -Port $RulePort"
    $proc = Start-Process -FilePath 'powershell.exe' -ArgumentList $argList -Verb RunAs -Wait -PassThru
    if ($proc.ExitCode -ne 0) {
        throw '防火墙规则添加失败或被取消。'
    }
    if (-not (Test-Asmc4FirewallRule -RulePort $RulePort)) {
        throw '防火墙规则添加后仍未检测到，请手动允许端口或重试。'
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
    Write-Host '  [Build] 正在构建...'
    node build.mjs
    if ($LASTEXITCODE -ne 0) { throw '构建失败' }
}

function Start-WatchProcess {
    Write-Host '  [Watch] 保存文件后自动重建...'
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

function Enable-WebPhoneLanFallback {
    param(
        [int]$ServePort,
        [string]$ResumeSurface,
        [string]$Reason
    )

    $lanIP = Get-LanIP
    if (-not $lanIP) {
        throw "$Reason 未检测到 LAN IP — 请选菜单 2（LAN）或连接 adb/USB。"
    }

    Write-Host "  [WARN] $Reason" -ForegroundColor Yellow
    Write-Host "         手机网页: http://${lanIP}:$ServePort/（与 PC 同 Wi-Fi）"
    Ensure-LanFirewall -RulePort $ServePort

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
        Ensure-LanFirewall -RulePort $ServePort
        $lanIP = Get-LanIP
    }

    if ($WebTarget -eq 'adb') {
        $adbDeviceId = Ensure-AdbDevice -AllowMissing
        $ServePort = Get-FreePort -StartPort $ServePort

        if ($adbDeviceId) {
            $reverse = Set-AdbReversePort -DeviceId $adbDeviceId -Port $ServePort

            if (Test-AdbReverseOk -Result $reverse) {
                Write-Host "  [Adb]  reverse tcp:$ServePort -> 本机"
                $useAdbReverse = $true
            } else {
                foreach ($line in $reverse.Output) {
                    if ($line) { Write-Host "         $line" -ForegroundColor DarkYellow }
                }
                $fallback = Enable-WebPhoneLanFallback -ServePort $ServePort -ResumeSurface $ResumeSurface `
                    -Reason 'adb reverse 不可用（无线 adb 常见）；'
                $lanIP = $fallback.LanIP
                $webPhoneViaLan = $true
            }
        } else {
            $fallback = Enable-WebPhoneLanFallback -ServePort $ServePort -ResumeSurface $ResumeSurface `
                -Reason '无 adb 设备，手机网页走 LAN。'
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

    $parts = @('1  重新构建')
    if ($AndroidEnabled) { $parts += '2  安装到设备' }
    $parts += '0  退出'
    Write-Host ('  ' + ($parts -join '    ')) -ForegroundColor $ForegroundColor
}

function Write-DevSessionBanner {
    param($Session)

    Write-Host ''
    if ($Session.WebEnabled -and $Session.AndroidEnabled) {
        Write-Host '  >>>  ASMC4 - 网页 + 安卓' -ForegroundColor Green
    } elseif ($Session.WebEnabled) {
        Write-Host '  >>>  ASMC4 - 网页预览' -ForegroundColor Green
    } else {
        Write-Host '  >>>  ASMC4 - 安卓应用' -ForegroundColor Green
    }
    Write-Host ''

    if ($Session.WebEnabled) {
        Write-Host '  网页：保存后按 1 或刷新浏览器（后台 watch 已开启）。'
        Write-Host ''
        switch ($Session.WebTarget) {
            'pc' {
                Write-Host "  本机   http://localhost:$($Session.ServePort)/"
            }
            'lan' {
                Write-Host "  本机   http://localhost:$($Session.ServePort)/"
                if ($Session.LanIP) {
                    Write-Host "  手机   http://$($Session.LanIP):$($Session.ServePort)/" -ForegroundColor Cyan
                } else {
                    Write-Host '  手机   （未检测到 LAN IP）'
                }
            }
            'adb' {
                if ($Session.WebPhoneViaLan -and $Session.LanIP) {
                    Write-Host "  本机   http://localhost:$($Session.ServePort)/"
                    Write-Host "  手机   http://$($Session.LanIP):$($Session.ServePort)/" -ForegroundColor Cyan
                    Write-Host '         （adb reverse 不可用，需与 PC 同 Wi-Fi）' -ForegroundColor DarkGray
                } else {
                    Write-Host "  手机   http://localhost:$($Session.ServePort)/" -ForegroundColor Cyan
                }
            }
        }
        Write-Host ''
    }

    if ($Session.AndroidEnabled) {
        Write-Host '  安卓：按 2 重新构建、同步并安装到设备。'
        if (-not $Session.AndroidDeviceId) {
            Write-Host '  （尚无设备 — 连接 adb 后按 2）' -ForegroundColor DarkYellow
        }
        Write-Host ''
    }

    Write-DevHotkeyLine -WebEnabled $Session.WebEnabled -AndroidEnabled $Session.AndroidEnabled
    Write-Host ''
}

function Show-DevMenu {
    $last = Get-LastDevChoice
    $lastLabel = Format-LastDevLabel -Choice $last

    Write-Host ''
    Write-Host '  ASMC4 开发预览' -ForegroundColor Green
    Write-Host '  ---------------------------------'
    Write-Host '  1  网页 - 本机'
    Write-Host '  2  网页 - 手机 LAN（同 Wi-Fi）'
    Write-Host '  3  网页 - 手机 adb（USB / 无线）'
    Write-Host '  4  安卓应用 - adb 安装'
    Write-Host '  5  导出 APK'
    Write-Host '  6  网页 + 安卓（组合，下一步选网页访问方式）'
    Write-Host '  7  无线 adb 配对'
    Write-Host '  ---------------------------------'
    Write-Host "  上次: $lastLabel  （直接回车重复）"
    Write-Host ''
    Write-Host '  选择 1-7' -NoNewline
    $char = [Console]::ReadKey($true).KeyChar

    if ($char -eq "`r" -or $char -eq "`n") {
        Write-Host '  (重复上次)'
        if (-not $last.Surface) { throw '无上次记录，请输入数字。' }
        return @{ Surface = $last.Surface; Target = $last.Target }
    }

    Write-Host "  $char"
    switch ($char) {
        '1' { return @{ Surface = 'web'; Target = 'pc' } }
        '2' { return @{ Surface = 'web'; Target = 'lan' } }
        '3' { return @{ Surface = 'web'; Target = 'adb' } }
        '4' { return @{ Surface = 'android'; Target = '' } }
        '5' {
            Write-Host ''
            Write-Host '  APK 类型:'
            Write-Host '  1  debug    2  release'
            Write-Host '  选择 1-2' -NoNewline
            $apkChar = [Console]::ReadKey($true).KeyChar
            Write-Host "  $apkChar"
            $apkVariant = switch ($apkChar) {
                '1' { 'debug' }
                '2' { 'release' }
                "`r" { '' }
                "`n" { '' }
                default { throw '无效的 APK 类型选择。' }
            }
            return @{ Surface = 'apk'; Target = $apkVariant }
        }
        '6' {
            Write-Host ''
            Write-Host '  本会话网页访问方式:'
            Write-Host '  1  本机    2  LAN（Wi-Fi）    3  adb（USB / 无线）'
            Write-Host '  选择 1-3' -NoNewline
            $webChar = [Console]::ReadKey($true).KeyChar
            Write-Host "  $webChar"
            $webTarget = switch ($webChar) {
                '1' { 'pc' }
                '2' { 'lan' }
                '3' { 'adb' }
                default { throw '无效的网页访问选择。' }
            }
            return @{ Surface = 'full'; Target = $webTarget }
        }
        '7' { return @{ Surface = 'pair'; Target = '' } }
        default { throw '无效选择。' }
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
        Write-Host '  [Web]  dist/ 已重建 — 请刷新浏览器。' -ForegroundColor Green
    } elseif ($Session.AndroidEnabled) {
        Write-Host '  [Build] dist/ 已重建 — 按 2 安装到设备。' -ForegroundColor Green
    }
}

function Invoke-DevAndroidPush {
    param($Session)

    $device = Ensure-AndroidDeviceId -Session $Session
    Invoke-InitialBuild
    Deploy-AndroidToDevice -DeviceId $device
    Write-Host '  [Android] 已更新到设备。' -ForegroundColor Green
}

function Wait-DevSessionKeys {
    param($Session)

    while ($true) {
        if (-not [Console]::KeyAvailable) {
            Start-Sleep -Milliseconds 150
            continue
        }

        $key = [Console]::ReadKey($true)
        if ($key.KeyChar -eq '0') { return }

        if ($key.KeyChar -eq '1') {
            Write-Host ''
            Write-Host '  --- 重新构建 ---' -ForegroundColor Yellow
            try {
                Invoke-DevRebuild -Session $Session
            } catch {
                Write-Host "  [ERROR] $_" -ForegroundColor Red
            }
            Write-Host ''
            Write-DevHotkeyLine -WebEnabled $Session.WebEnabled -AndroidEnabled $Session.AndroidEnabled -ForegroundColor DarkGray
            continue
        }

        if ($key.KeyChar -eq '2' -and $Session.AndroidEnabled) {
            Write-Host ''
            Write-Host '  --- 构建并安装安卓 ---' -ForegroundColor Yellow
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
                Write-Host '  [Android] 尚无设备 — 连接 adb/USB 后按 2。'
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
                Write-Host '  [Android] 按 2 重试安装。' -ForegroundColor Yellow
            }
        }

        $titleParts = @()
        if ($WebEnabled) { $titleParts += "web/$WebTarget" }
        if ($AndroidEnabled) { $titleParts += 'android' }
        $titleSuffix = if ($WebEnabled) { " - $($session.ServePort)" } else { '' }
        $Host.UI.RawUI.WindowTitle = "ASMC4 $($titleParts -join '+')$titleSuffix"

        Write-DevSessionBanner -Session $session
        if ($androidDeployed) {
            Write-Host '  [Android] 已安装并在设备上启动。'
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

function Install-AndroidDebug {
    param([string]$DeviceId)

    $resolved = Resolve-AdbDevices
    if ($resolved) { $DeviceId = $resolved }
    if (-not $DeviceId) { throw '无 adb 设备，无法 installDebug。' }

    $env:ANDROID_SERIAL = $DeviceId
    try {
        Invoke-Adb -DeviceId $DeviceId -Command @('wait-for-device') | Out-Null

        Write-Host "  [Android] gradlew installDebug -> $DeviceId ..."
        $result = Invoke-Gradle installDebug

        if (-not (Test-GradleOk $result)) {
            $text = $result.Output -join "`n"
            if ($text -match 'INSTALL_FAILED_UPDATE_INCOMPATIBLE|signatures do not match') {
                Write-Host '  [Android] 签名不匹配，正在卸载旧包...'
                Invoke-Adb -DeviceId $DeviceId -Command @('uninstall', $script:AndroidAppId) | Out-Null
                $result = Invoke-Gradle installDebug
            }
        }

        if (-not (Test-GradleOk $result)) {
            Write-Host '  [Android] 安装重试...'
            Start-Sleep -Seconds 2
            $DeviceId = Resolve-AdbDevices
            if (-not $DeviceId) { throw '重试时无 adb 设备。' }
            $env:ANDROID_SERIAL = $DeviceId
            Invoke-Adb -DeviceId $DeviceId -Command @('wait-for-device') | Out-Null
            $result = Invoke-Gradle installDebug
        }

        if (-not (Test-GradleOk $result)) {
            $tail = Get-GradleFailureTail -Result $result
            throw "installDebug 失败:`n$tail"
        }

        Write-Host '  [Android] installDebug 完成'
    } finally {
        Remove-Item Env:ANDROID_SERIAL -ErrorAction SilentlyContinue
    }
}

function Start-AndroidApp {
    param([string]$DeviceId)

    Write-Host '  [Android] 正在启动应用...'
    $result = Invoke-Adb -DeviceId $DeviceId -Command @(
        'shell', 'am', 'start', '-n', "$($script:AndroidAppId)/.MainActivity"
    )
    if ($result.ExitCode -ne 0) {
        throw '无法在设备上启动应用'
    }
}

function Sync-CapAndroid {
    Write-Host '  [Cap]  正在同步 dist/ 到 android/...'
    $oldEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        npx cap sync android
        if ($LASTEXITCODE -ne 0) { throw 'cap sync 失败' }
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

function Start-AdbPairFlow {
    while (Show-AdbWirelessMenu) { }
}

if (-not $Surface) {
    $picked = Show-DevMenu
    $Surface = $picked.Surface
    if ($picked.Target) { $Target = $picked.Target }
}

if ($Surface -and $Surface -ne 'pair') {
    Save-LastDevChoice -Surface $Surface -Target $Target
}

if ($Surface -eq 'web') {
    if (-not $Target) { $Target = 'lan' }
    Start-WebDev -WebTarget $Target -ServePort $Port
} elseif ($Surface -eq 'full') {
    if (-not $Target) { $Target = 'lan' }
    Start-DevSession -WebEnabled $true -AndroidEnabled $true -WebTarget $Target -ServePort $Port
} elseif ($Surface -eq 'android') {
    Start-AndroidDev
} elseif ($Surface -eq 'apk') {
    $apkArgs = @()
    if ($Target -in @('debug', 'release')) {
        $apkArgs += '-Variant'
        $apkArgs += $Target
    }
    & (Join-Path $ProjectRoot 'scripts/build-apk.ps1') @apkArgs
} elseif ($Surface -eq 'pair') {
    Start-AdbPairFlow
} else {
    throw "未知模式: $Surface"
}
