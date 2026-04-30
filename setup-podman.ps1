# ============================================================
# setup-podman.ps1
# Ejecutar en PowerShell como Administrador
# ============================================================
# Paso 1: Instalar WSL + Ubuntu (solo si no está instalado)
# ============================================================

Write-Host "`n[1/4] Instalando WSL con Ubuntu..." -ForegroundColor Cyan
wsl --install --no-launch

Write-Host "`n[2/4] Habilitando Virtual Machine Platform..." -ForegroundColor Cyan
dism /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
dism /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

Write-Host @"

============================================================
  REINICIO REQUERIDO
============================================================
  Después de reiniciar, abre PowerShell normal (no Admin)
  y ejecuta estos comandos en orden:

    1. podman machine init
    2. podman machine start
    3. cd C:\stc-produccion-v2
    4. podman compose up -d postgres

  Luego verifica con:
    podman ps

  Debes ver stc_postgres con STATUS "Up (healthy)"
============================================================
"@ -ForegroundColor Yellow

$restart = Read-Host "¿Reiniciar ahora? (S/N)"
if ($restart -eq "S" -or $restart -eq "s") {
    Restart-Computer -Force
}
