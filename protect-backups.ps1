param([string]$Directory = (Join-Path $PSScriptRoot 'backend\backups'))
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$backupTarget = [IO.Path]::GetFullPath($Directory)
if ($backupTarget.TrimEnd('\') -eq [IO.Path]::GetPathRoot($backupTarget).TrimEnd('\') -or $backupTarget.TrimEnd('\') -eq $PSScriptRoot.TrimEnd('\')) {
  throw 'Use una carpeta dedicada para backups, nunca la raíz del disco o del proyecto.'
}
New-Item -ItemType Directory -Force -Path $backupTarget | Out-Null
$permissions = Get-Acl -LiteralPath $backupTarget
$permissions.SetAccessRuleProtection($true, $false)
foreach ($existingRule in @($permissions.Access)) { $permissions.RemoveAccessRuleSpecific($existingRule) }
$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent().User
foreach ($identity in @($currentIdentity, [Security.Principal.SecurityIdentifier]'S-1-5-18', [Security.Principal.SecurityIdentifier]'S-1-5-32-544')) {
  $rule = New-Object Security.AccessControl.FileSystemAccessRule($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
  $permissions.AddAccessRule($rule)
}
Set-Acl -LiteralPath $backupTarget -AclObject $permissions
Write-Host 'Carpeta de backups protegida para el usuario actual, SYSTEM y administradores locales.'
