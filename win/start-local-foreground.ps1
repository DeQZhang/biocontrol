$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (!(Test-Path .env.local)) { Copy-Item .env.local.example .env.local }
$envContent = Get-Content .env.local | Where-Object { $_ -and -not $_.StartsWith('#') }
foreach ($line in $envContent) {
  $parts = $line.Split('=', 2)
  if ($parts.Count -eq 2) { [Environment]::SetEnvironmentVariable($parts[0], $parts[1], 'Process') }
}
$arch = $env:PROCESSOR_ARCHITECTURE.ToLower()
$binary = if ($arch -eq 'arm64') { '.\\bin\\biocontrol-windows-arm64.exe' } else { '.\\bin\\biocontrol-windows-amd64.exe' }
& $binary
