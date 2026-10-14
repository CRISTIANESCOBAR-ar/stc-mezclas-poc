Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot 'backend')
if (-not (Test-Path "node_modules")) {
  npm ci
}

npm run dev
