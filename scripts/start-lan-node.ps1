#requires -Version 5.1
param(
    [ValidateRange(1, 65535)]
    [int]$Port = 8000
)
& "$PSScriptRoot\dev.ps1" -Surface web -Target lan -Port $Port
