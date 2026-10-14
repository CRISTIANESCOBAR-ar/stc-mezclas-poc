param([string]$DatabaseComposeDirectory = $env:STC_DB_COMPOSE_DIR)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Optional: the database may already run locally, in Podman, or remotely.
if ($DatabaseComposeDirectory) {
  Push-Location (Resolve-Path -LiteralPath $DatabaseComposeDirectory)
  try {
    podman compose up -d postgres
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar PostgreSQL.' }
  } finally { Pop-Location }
}

$logDirectory = Join-Path $PSScriptRoot 'backend\data\logs'
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
Start-Process powershell -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDirectory 'backend.log') -RedirectStandardError (Join-Path $logDirectory 'backend-error.log') -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + (Join-Path $PSScriptRoot 'start-backend.ps1') + '"')
Start-Process powershell -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDirectory 'frontend.log') -RedirectStandardError (Join-Path $logDirectory 'frontend-error.log') -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + (Join-Path $PSScriptRoot 'start-frontend.ps1') + '"')
Write-Host 'Arranque solicitado. El backend verifica credenciales, base y migraciones antes de aceptar solicitudes.'
Write-Host 'Frontend: http://127.0.0.1:5173. Verificar estado con .\check-stack.ps1.'
Write-Host 'Logs de desarrollo: backend\data\logs.'
