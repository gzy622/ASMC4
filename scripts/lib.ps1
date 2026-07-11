#requires -Version 5.1
# ASMC4 script library loader. Dot-source from scripts/*.ps1.

. (Join-Path $PSScriptRoot 'lib\common.ps1')
. (Join-Path $PSScriptRoot 'lib\adb.ps1')
. (Join-Path $PSScriptRoot 'lib\android-build.ps1')
