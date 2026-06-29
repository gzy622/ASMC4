#requires -Version 5.1
<#
  Build ASMC4 APK and copy to a folder (e.g. Desktop) for remote download.
  No adb required.

  Usage:
    build-apk.ps1
    build-apk.ps1 -OutputDir "D:\share"
    build-apk.ps1 -Variant release

  Config (optional): scripts/dev-device.local.json
    apkOutputDir  - empty = Desktop
    apkVariant    - debug | release (default debug)
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

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
Set-Location -LiteralPath $ProjectRoot

$KeystorePath = Join-Path $ProjectRoot 'asmc4.keystore'

function Read-Utf8Text {
    param([string]$Path)
    return [System.IO.File]::ReadAllText($Path, [System.Text.UTF8Encoding]::new($false))
}

function Get-LocalConfig {
    $path = Join-Path $ProjectRoot 'scripts/dev-device.local.json'
    if (-not (Test-Path -LiteralPath $path)) { return $null }
    try {
        return Read-Utf8Text -Path $path | ConvertFrom-Json
    } catch {
        Write-Host "[WARN] Could not parse dev-device.local.json: $_"
        return $null
    }
}

function Resolve-ApkSettings {
    $cfg = Get-LocalConfig

    $dir = $OutputDir
    if (-not $dir -and $cfg -and $cfg.apkOutputDir) {
        $dir = [string]$cfg.apkOutputDir
    }
    if (-not $dir) {
        $dir = [Environment]::GetFolderPath('Desktop')
    }
    $dir = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($dir)

    $variant = $Variant
    if (-not $variant -and $cfg -and $cfg.apkVariant) {
        $variant = [string]$cfg.apkVariant
    }
    if (-not $variant) { $variant = 'debug' }

    if ($variant -eq 'release' -and -not (Test-Path -LiteralPath $KeystorePath)) {
        Write-Host '  [APK]  asmc4.keystore not found - using debug instead'
        $variant = 'debug'
    }

    return @{
        OutputDir = $dir
        Variant   = $variant
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

function Get-BuiltApkPath {
    param([string]$ApkVariant)

    $base = Join-Path $ProjectRoot 'android/app/build/outputs/apk'
    if ($ApkVariant -eq 'release') {
        return Join-Path $base 'release/app-release.apk'
    }
    return Join-Path $base 'debug/app-debug.apk'
}

$settings = Resolve-ApkSettings
$outDir = $settings.OutputDir
$variant = $settings.Variant

if (-not (Test-Path -LiteralPath $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

Write-Host ''
Write-Host '  >>>  ASMC4 - Build APK' -ForegroundColor Green
Write-Host ''
Write-Host "  Variant   $variant"
Write-Host "  Output    $outDir"
Write-Host ''

Write-Host '  [Build] Web dist...'
node build.mjs
if ($LASTEXITCODE -ne 0) { throw 'Web build failed' }

Write-Host '  [Cap]   Syncing to android/...'
$oldEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
    npx cap sync android
    if ($LASTEXITCODE -ne 0) { throw 'cap sync failed' }
} finally {
    $ErrorActionPreference = $oldEap
}

$gradleTask = if ($variant -eq 'release') { 'assembleRelease' } else { 'assembleDebug' }
Write-Host "  [Gradle] $gradleTask (first run may take several minutes)..."
$result = Invoke-Gradle $gradleTask
if ($result.ExitCode -ne 0) {
    $tail = ($result.Output | Select-Object -Last 10) -join "`n"
    throw "Gradle $gradleTask failed:`n$tail"
}

$apkSrc = Get-BuiltApkPath -ApkVariant $variant
if (-not (Test-Path -LiteralPath $apkSrc)) {
    throw "APK not found: $apkSrc"
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$apkName = "ASMC4-$stamp-$variant.apk"
$apkDest = Join-Path $outDir $apkName

Copy-Item -LiteralPath $apkSrc -Destination $apkDest -Force

Write-Host ''
Write-Host '  Done.' -ForegroundColor Green
Write-Host "  $apkDest"
Write-Host ''
Write-Host '  Download this file to your phone via remote control, then install.'
Write-Host ''
