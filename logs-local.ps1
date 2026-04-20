$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
New-Item -ItemType Directory -Force logs | Out-Null
if (!(Test-Path logs/biocontrol.log)) { New-Item logs/biocontrol.log -ItemType File | Out-Null }
Get-Content logs/biocontrol.log -Wait
