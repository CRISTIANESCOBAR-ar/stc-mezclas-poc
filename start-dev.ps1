Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Levantar DB por si no esta activa
Set-Location "C:\stc-produccion-v2"
podman machine start | Out-Null
podman compose up -d postgres | Out-Null

# Lanzar backend y frontend en ventanas separadas
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "C:\stc-mezclas-poc\start-backend.ps1"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "C:\stc-mezclas-poc\start-frontend.ps1"

Write-Host "Servicios iniciados:" -ForegroundColor Green
Write-Host "- Backend: http://localhost:3005/api/health"
Write-Host "- Frontend: revisa la URL que imprime Vite (normalmente http://localhost:5173)"
