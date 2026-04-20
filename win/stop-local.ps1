$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (Test-Path biocontrol.pid) {
  $pidValue = Get-Content biocontrol.pid
  Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
  Remove-Item biocontrol.pid -ErrorAction SilentlyContinue
  Write-Host 'Stopped BioControl'
} else {
  Write-Host 'BioControl is not running'
}
