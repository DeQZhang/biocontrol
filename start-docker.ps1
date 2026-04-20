$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (!(Test-Path .env)) {
  $dbPass = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 24 | ForEach-Object {[char]$_})
  $rootPass = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 24 | ForEach-Object {[char]$_})
  (Get-Content .env.example).Replace('BIOCONTROL_DB_PASSWORD=AUTO_GENERATED', "BIOCONTROL_DB_PASSWORD=$dbPass").Replace('BIOCONTROL_MYSQL_ROOT_PASSWORD=AUTO_GENERATED', "BIOCONTROL_MYSQL_ROOT_PASSWORD=$rootPass") | Set-Content .env
}
docker compose up --build -d
docker compose ps
