$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (Test-Path biocontrol.pid) {
  $pidValue = Get-Content biocontrol.pid
  $proc = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
  if ($proc) { Write-Host "BioControl is running, PID=$pidValue" } else { Write-Host 'BioControl is not running' }
} else {
  Write-Host 'BioControl is not running'
}
