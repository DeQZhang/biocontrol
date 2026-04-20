$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (!(Test-Path .env.local)) { Copy-Item .env.local.example .env.local }
New-Item -ItemType Directory -Force logs | Out-Null
$proc = Start-Process -FilePath powershell -ArgumentList '-ExecutionPolicy','Bypass','-File','.\\start-local-foreground.ps1' -RedirectStandardOutput logs/biocontrol.log -RedirectStandardError logs/biocontrol.err.log -PassThru
$proc.Id | Set-Content biocontrol.pid
Write-Host "Started BioControl locally, PID=$($proc.Id)"
