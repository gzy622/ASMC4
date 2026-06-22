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

function Stop-ExistingServer {
    param([int]$Port)
    
    $connections = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    if ($null -eq $connections -or $connections.Count -eq 0) {
        return $false
    }

    $pids = @($connections | Select-Object -ExpandProperty OwningProcess -Unique)
    foreach ($pid in $pids) {
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($null -ne $process) {
            Write-Host "  Found process: $($process.Name) (PID: $pid)" -ForegroundColor Yellow
            try {
                Stop-Process -Id $pid -Force -ErrorAction Stop
                Write-Host "  Stopped process $($process.Name) (PID: $pid)" -ForegroundColor Green
            }
            catch {
                Write-Host "  Failed to stop process: $_" -ForegroundColor Red
                return $false
            }
        }
    }
    Start-Sleep -Milliseconds 500
    return $true
}

try {
    $existingListener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($null -ne $existingListener) {
        $existingPid = $existingListener.OwningProcess
        $existingProcess = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
        $processName = if ($null -ne $existingProcess) { $existingProcess.Name } else { "Unknown" }
        
        Write-Host ''
        Write-Host "Port $Port is already in use by: $processName (PID: $existingPid)" -ForegroundColor Yellow
        Write-Host ''
        Write-Host 'Options:' -ForegroundColor Cyan
        Write-Host '  [K] Kill existing process and start server'
        Write-Host '  [N] Start on next available port'
        Write-Host '  [Q] Quit'
        Write-Host ''
        
        $choice = ''
        while ($choice -notin @('K', 'N', 'Q')) {
            $choice = Read-Host 'Choose an option (K/N/Q)'
            $choice = $choice.ToUpper()
        }
        
        switch ($choice) {
            'K' {
                Write-Host ''
                Write-Host 'Stopping existing server...' -ForegroundColor Yellow
                $stopped = Stop-ExistingServer -Port $Port
                if (-not $stopped) {
                    throw "Failed to stop existing server on port $Port"
                }
                Write-Host 'Existing server stopped.' -ForegroundColor Green
            }
            'N' {
                $newPort = $Port
                do {
                    $newPort++
                    $portInUse = Get-NetTCPConnection -State Listen -LocalPort $newPort -ErrorAction SilentlyContinue
                } while ($null -ne $portInUse)
                
                Write-Host ''
                Write-Host "Starting server on port $newPort instead..." -ForegroundColor Cyan
                $Port = $newPort
            }
            'Q' {
                Write-Host ''
                Write-Host 'Cancelled.' -ForegroundColor Yellow
                exit 0
            }
        }
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

