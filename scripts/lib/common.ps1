#requires -Version 5.1
# Shared paths, console setup, and machine-local configuration.

$script:ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$script:AndroidAppId = 'com.gzy622.asmc4'
$script:AdbWirelessPlaceholder = '192.168.1.100:5555'

function Initialize-Asmc4Console {
    try { chcp 65001 | Out-Null } catch {}
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $global:OutputEncoding = [Console]::OutputEncoding
}

function Read-Utf8Text {
    param([string]$Path)
    return [System.IO.File]::ReadAllText($Path, [System.Text.UTF8Encoding]::new($false))
}

function Write-Utf8Text {
    param([string]$Path, [string]$Content)
    [System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($true))
}

function Get-DevDeviceConfigPath {
    return Join-Path $script:ProjectRoot 'scripts/dev-device.local.json'
}

function Get-DevDeviceConfig {
    $localPath = Get-DevDeviceConfigPath
    if (-not (Test-Path -LiteralPath $localPath)) { return $null }

    try {
        return Read-Utf8Text -Path $localPath | ConvertFrom-Json
    } catch {
        Write-Host "[WARN] 无法解析 dev-device.local.json: $_"
        return $null
    }
}

function Get-ConfigProp {
    param($Cfg, [string]$Name)

    if (-not $Cfg) { return $null }
    $prop = $Cfg.PSObject.Properties[$Name]
    if (-not $prop -or $null -eq $prop.Value) { return $null }
    return [string]$prop.Value
}

function Update-DevDeviceConfig {
    param([hashtable]$Updates)

    $localPath = Get-DevDeviceConfigPath
    $cfg = [ordered]@{}
    if (Test-Path -LiteralPath $localPath) {
        try {
            $parsed = Read-Utf8Text -Path $localPath | ConvertFrom-Json
            foreach ($prop in $parsed.PSObject.Properties) {
                $cfg[$prop.Name] = $prop.Value
            }
        } catch {
            Write-Host "[WARN] 读取 dev-device.local.json 失败: $_"
        }
    }

    foreach ($key in $Updates.Keys) {
        $cfg[$key] = $Updates[$key]
    }

    $json = ($cfg | ConvertTo-Json -Depth 4)
    Write-Utf8Text -Path $localPath -Content $json
}

function Get-LastDevChoice {
    $cfg = Get-DevDeviceConfig
    return @{
        Surface = Get-ConfigProp $cfg 'lastSurface'
        Target  = Get-ConfigProp $cfg 'lastTarget'
    }
}

function Save-LastDevChoice {
    param(
        [string]$Surface,
        [string]$Target = ''
    )

    $updates = @{ lastSurface = $Surface }
    if ($Target) { $updates['lastTarget'] = $Target }
    Update-DevDeviceConfig -Updates $updates
}

function Format-LastDevLabel {
    param($Choice)

    if (-not $Choice.Surface) { return '无' }

    switch ($Choice.Surface) {
        'web' {
            switch ($Choice.Target) {
                'pc' { return '1 网页-本机' }
                'lan' { return '2 网页-手机 LAN' }
                'adb' { return '3 网页-手机 adb' }
                default { return "网页 ($($Choice.Target))" }
            }
        }
        'android' { return '4 安卓应用' }
        'apk' {
            if ($Choice.Target -in @('debug', 'release')) { return "5 导出 APK ($($Choice.Target))" }
            return '5 导出 APK'
        }
        'full' {
            $target = switch ($Choice.Target) {
                'pc' { '本机' }
                'lan' { 'LAN' }
                'adb' { 'adb' }
                default { $Choice.Target }
            }
            return "6 网页+安卓 ($target)"
        }
        default { return "$($Choice.Surface) $($Choice.Target)" }
    }
}

function Read-DevRetryOnce {
    param([string]$Label = '再来一次')

    Write-Host ''
    $answer = Read-Host "  1  $Label，回车退出"
    return ("$answer".Trim() -eq '1')
}
