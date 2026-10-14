param(
  [Parameter(Mandatory = $true)][ValidatePattern('^[a-zA-Z0-9_.-]{3,64}$')][string]$Username,
  [ValidateSet('consulta', 'operador', 'administrador')][string]$Role = 'consulta'
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$secretPassword = Read-Host 'Contraseña (mínimo 12 caracteres)' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretPassword)
try {
  $env:STC_USER_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  Push-Location (Join-Path $PSScriptRoot 'backend')
  try {
    node scripts/create-user.js $Username $Role
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear el usuario.' }
  } finally { Pop-Location }
} finally {
  Remove-Item Env:STC_USER_PASSWORD -ErrorAction SilentlyContinue
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
}
