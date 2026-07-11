#requires -Version 5.1
# Shared Web build, Capacitor sync, Gradle, install, and APK helpers.

function Invoke-WebBuild {
    Write-Host '  [Build] 正在构建...'
    Push-Location -LiteralPath $script:ProjectRoot
    try {
        $output = & node build.mjs 2>&1
        $exitCode = $LASTEXITCODE
        $output | ForEach-Object { Write-Host "$_" }
        if ($exitCode -ne 0) { throw '网页构建失败' }
    } finally {
        Pop-Location
    }
}

function Sync-CapAndroid {
    Write-Host '  [Cap]   正在同步 dist/ 到 android/...'
    $oldEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    Push-Location -LiteralPath $script:ProjectRoot
    try {
        $output = & npx cap sync android 2>&1
        $exitCode = $LASTEXITCODE
        $output | ForEach-Object { Write-Host "$_" }
        if ($exitCode -ne 0) { throw 'cap sync 失败' }
    } finally {
        Pop-Location
        $ErrorActionPreference = $oldEap
    }
}

function Invoke-Gradle {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GradleArgs)

    $oldEap = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    $androidDir = Join-Path $script:ProjectRoot 'android'
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

function Deploy-AndroidToDevice {
    param([string]$DeviceId)

    Sync-CapAndroid
    Install-AndroidDebug -DeviceId $DeviceId
    Start-AndroidApp -DeviceId $DeviceId
}

function Get-BuiltApkPath {
    param([string]$Variant)

    $base = Join-Path $script:ProjectRoot 'android/app/build/outputs/apk'
    if ($Variant -eq 'release') {
        return Join-Path $base 'release/app-release.apk'
    }
    return Join-Path $base 'debug/app-debug.apk'
}

function Invoke-AndroidApkBuild {
    param([ValidateSet('debug', 'release')][string]$Variant)

    Invoke-WebBuild
    Sync-CapAndroid

    $gradleTask = if ($Variant -eq 'release') { 'assembleRelease' } else { 'assembleDebug' }
    Write-Host "  [Gradle] $gradleTask（首次可能需数分钟）..."
    $result = Invoke-Gradle $gradleTask
    if (-not (Test-GradleOk $result)) {
        $tail = Get-GradleFailureTail -Result $result
        throw "Gradle $gradleTask 失败:`n$tail"
    }

    $apkPath = Get-BuiltApkPath -Variant $Variant
    if (-not (Test-Path -LiteralPath $apkPath)) {
        throw "未找到 APK: $apkPath"
    }
    return $apkPath
}
