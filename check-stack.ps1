param([string]$BackendOrigin = $env:STC_API_TARGET)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not $BackendOrigin) {
  $backendPort = '3005'
  $envFile = Join-Path $PSScriptRoot 'backend\.env'
  if (Test-Path -LiteralPath $envFile) {
    $portLine = Get-Content -LiteralPath $envFile | Where-Object { $_ -match '^PORT=(\d+)$' } | Select-Object -First 1
    if ($portLine -match '^PORT=(\d+)$') { $backendPort = $Matches[1] }
  }
  $BackendOrigin = 'http://127.0.0.1:' + $backendPort
}
foreach ($health in @('/api/health/live', '/api/health')) {
  try {
    $response = Invoke-RestMethod -Uri ($BackendOrigin + $health) -TimeoutSec 5
    Write-Host ($health + ': OK') -ForegroundColor Green
  } catch {
    Write-Host ($health + ': NO DISPONIBLE') -ForegroundColor Yellow
  }
}
