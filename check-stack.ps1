Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "=== STC PoC status ===" -ForegroundColor Cyan
podman ps --filter name=stc_postgres --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

try {
  $resp = Invoke-WebRequest -Uri "http://localhost:3005/api/health" -UseBasicParsing -TimeoutSec 5
  Write-Host "Backend OK: $($resp.Content)" -ForegroundColor Green
} catch {
  Write-Host "Backend no responde en http://localhost:3005/api/health" -ForegroundColor Yellow
}
