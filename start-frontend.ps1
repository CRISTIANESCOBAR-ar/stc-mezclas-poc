Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location "C:\stc-mezclas-poc\frontend"
if (-not (Test-Path "node_modules")) {
  npm install
}

npm run dev
