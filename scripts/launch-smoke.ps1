$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$exeCandidates = @(
  (Join-Path $root 'release\win-unpacked\VEIL Player.exe'),
  (Join-Path $root 'release\win-unpacked\VEIL.exe')
)
$exe = $exeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $exe) {
  $portable = Get-ChildItem (Join-Path $root 'release') -Filter '*-portable.exe' | Select-Object -First 1
  if ($null -eq $portable) {
    throw 'No packaged VEIL executable found. Run npm run dist first.'
  }
  Write-Host "Unpackaged portable not launched directly; using win-unpacked if present."
}

if (-not $exe) {
  Write-Host 'SKIP: win-unpacked executable missing; portable EXE exists but requires extraction to smoke-launch.'
  exit 0
}

$proc = Start-Process -FilePath $exe -PassThru
Start-Sleep -Seconds 4
if ($proc.HasExited) {
  throw "VEIL exited early with code $($proc.ExitCode)"
}
Stop-Process -Id $proc.Id -Force
Write-Host "OK: VEIL launched and stayed running for 4s (pid $($proc.Id))"
