#requires -Version 5.1

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateRange(1, 65535)]
    [int]$Port = 8000,

    [switch]$NoOpen
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

function Get-PythonCommand {
    $launcher = Get-Command -Name 'py.exe' -ErrorAction SilentlyContinue
    if ($null -ne $launcher) {
        & $launcher.Source -3 --version *> $null
        if ($LASTEXITCODE -eq 0) {
            return @{
                FilePath = $launcher.Source
                PrefixArguments = @('-3')
            }
        }
    }

    $python = Get-Command -Name 'python.exe' -ErrorAction SilentlyContinue
    if ($null -ne $python) {
        & $python.Source --version *> $null
        if ($LASTEXITCODE -eq 0) {
            return @{
                FilePath = $python.Source
                PrefixArguments = @()
            }
        }
    }

    throw 'Python 3 was not found. Install Python 3 and enable the Python launcher or add python.exe to PATH.'
}

function Get-LanIPv4Address {
    $configuration = Get-NetIPConfiguration -ErrorAction SilentlyContinue |
        Where-Object {
            ($null -ne $_.IPv4DefaultGateway) -and
            ($null -ne $_.IPv4Address)
        } |
        Select-Object -First 1

    if ($null -eq $configuration) {
        return $null
    }

    $addresses = @($configuration.IPv4Address)
    if ($addresses.Count -eq 0) {
        return $null
    }

    return $addresses[0].IPAddress
}

try {
    $existingListener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($null -ne $existingListener) {
        throw "Port $Port is already in use. Run again with another port, for example: start-lan-preview.cmd 8001"
    }

    $pythonCommand = Get-PythonCommand
    $localUrl = "http://localhost:$Port/"
    $lanAddress = Get-LanIPv4Address

    $Host.UI.RawUI.WindowTitle = "ASMC4 LAN Preview - Port $Port"
    Write-Host ''
    Write-Host 'ASMC4 preview server is starting...' -ForegroundColor Green
    Write-Host "Local: $localUrl"
    if ([string]::IsNullOrWhiteSpace($lanAddress)) {
        Write-Host 'LAN: unable to detect an IPv4 address; check ipconfig manually.' -ForegroundColor Yellow
    }
    else {
        Write-Host "LAN:   http://${lanAddress}:$Port/" -ForegroundColor Cyan
    }
    Write-Host ''
    Write-Host 'Keep this window open. Press Ctrl+C to stop the server.'
    Write-Host 'Windows Firewall may ask for permission on the first run.'
    Write-Host ''

    if (-not $NoOpen) {
        Start-Process -FilePath $localUrl
    }

    $serverArguments = @($pythonCommand.PrefixArguments) +
        @('-m', 'http.server', $Port.ToString(), '--bind', '0.0.0.0', '--directory', $projectRoot)
    & $pythonCommand.FilePath @serverArguments
    exit $LASTEXITCODE
}
catch {
    Write-Error $_
    exit 1
}

