#requires -Version 5.1
<#
  构建 ASMC4 APK 并复制到文件夹（如桌面）供远程下载。
  无需 adb。

  用法:
    build-apk.ps1
    build-apk.ps1 -OutputDir "D:\share"
    build-apk.ps1 -Variant release

  配置（可选）: scripts/dev-device.local.json
    apkOutputDir  - 空则桌面
    apkVariant    - debug | release（默认 debug）

  完成后按 R 可立即再导出一次。
#>

param(
    [string]$OutputDir = '',

    [ValidateSet('debug', 'release', '')]
    [string]$Variant = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

try { chcp 65001 | Out-Null } catch {}
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

. (Join-Path $PSScriptRoot 'lib.ps1')
$ProjectRoot = $script:ProjectRoot
Set-Location -LiteralPath $ProjectRoot

$KeystorePath = Join-Path $ProjectRoot 'asmc4.keystore'

function Resolve-ApkSettings {
    $cfg = Get-DevDeviceConfig

    $dir = $OutputDir
    if (-not $dir) {
        $fromCfg = Get-ConfigProp $cfg 'apkOutputDir'
        if ($fromCfg) { $dir = $fromCfg }
    }
    if (-not $dir) {
        $dir = [Environment]::GetFolderPath('Desktop')
    }
    $dir = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($dir)

    $variant = $Variant
    if (-not $variant) {
        $fromCfg = Get-ConfigProp $cfg 'apkVariant'
        if ($fromCfg) { $variant = $fromCfg }
    }
    if (-not $variant) { $variant = 'debug' }

    if ($variant -eq 'release' -and -not (Test-Path -LiteralPath $KeystorePath)) {
        Write-Host '  [APK]  未找到 asmc4.keystore，改用 debug'
        $variant = 'debug'
    }

    return @{
        OutputDir = $dir
        Variant   = $variant
    }
}

function Get-BuiltApkPath {
    param([string]$ApkVariant)

    $base = Join-Path $ProjectRoot 'android/app/build/outputs/apk'
    if ($ApkVariant -eq 'release') {
        return Join-Path $base 'release/app-release.apk'
    }
    return Join-Path $base 'debug/app-debug.apk'
}

function Invoke-BuildApkOnce {
    $settings = Resolve-ApkSettings
    $outDir = $settings.OutputDir
    $variant = $settings.Variant

    if (-not (Test-Path -LiteralPath $outDir)) {
        New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    }

    Write-Host ''
    Write-Host '  >>>  ASMC4 - 构建 APK' -ForegroundColor Green
    Write-Host ''
    Write-Host "  变体   $variant"
    Write-Host "  输出   $outDir"
    Write-Host ''

    Write-Host '  [Build] 构建网页 dist...'
    node build.mjs
    if ($LASTEXITCODE -ne 0) { throw '网页构建失败' }

    Write-Host '  [Cap]   同步到 android/...'
    $oldEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        npx cap sync android
        if ($LASTEXITCODE -ne 0) { throw 'cap sync 失败' }
    } finally {
        $ErrorActionPreference = $oldEap
    }

    $gradleTask = if ($variant -eq 'release') { 'assembleRelease' } else { 'assembleDebug' }
    Write-Host "  [Gradle] $gradleTask（首次可能需数分钟）..."
    $result = Invoke-Gradle $gradleTask
    if ($result.ExitCode -ne 0) {
        $tail = ($result.Output | Select-Object -Last 10) -join "`n"
        throw "Gradle $gradleTask 失败:`n$tail"
    }

    $apkSrc = Get-BuiltApkPath -ApkVariant $variant
    if (-not (Test-Path -LiteralPath $apkSrc)) {
        throw "未找到 APK: $apkSrc"
    }

    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $apkName = "ASMC4-$stamp-$variant.apk"
    $apkDest = Join-Path $outDir $apkName

    Copy-Item -LiteralPath $apkSrc -Destination $apkDest -Force

    Write-Host ''
    Write-Host '  完成。' -ForegroundColor Green
    Write-Host "  $apkDest"
    Write-Host ''
    Write-Host '  通过远程控制等方式将文件传到手机后安装。'
}

while ($true) {
    try {
        Invoke-BuildApkOnce
        if (-not (Read-DevRetryOnce -Label '再导出一次')) { break }
    } catch {
        Write-Host ''
        Write-Host "  [ERROR] $_" -ForegroundColor Red
        if (-not (Read-DevRetryOnce -Label '重试')) { throw }
    }
}
