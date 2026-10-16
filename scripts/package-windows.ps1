[CmdletBinding()]
param([string]$ReleaseDir = (Join-Path (Split-Path $PSScriptRoot -Parent) 'build-windows-vs2026/Release'))
. "$PSScriptRoot/windows-distribution-common.ps1"
Assert-Windows
$ReleaseDir = (Resolve-Path $ReleaseDir).Path
$stage = Join-Path $RepoRoot 'dist/windows/app'
$distributionRoot = [IO.Path]::GetFullPath((Join-Path $RepoRoot 'dist/windows'))
if ($ReleaseDir.Equals($distributionRoot, [StringComparison]::OrdinalIgnoreCase) -or
    $ReleaseDir.StartsWith($distributionRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Release source must be outside dist/windows to protect it during staging.'
}
if (@(Get-ChildItem (Join-Path $ReleaseDir 'ui') -Recurse -Force | Where-Object {
    $_.Attributes -band [IO.FileAttributes]::ReparsePoint
}).Count -gt 0) { throw 'Bundled UI cannot contain reparse points.' }
# Explicit runtime inventory for the current static-loader build; never glob raw build output.
$required = @('MiyazatoSpatialEngine.exe', 'ui/index.html', 'ui/assets', 'ui/branding')
foreach ($relative in $required) {
    if (-not (Test-Path (Join-Path $ReleaseDir $relative))) { throw "Release runtime file missing: $relative in $ReleaseDir" }
}
$exe = Join-Path $ReleaseDir 'MiyazatoSpatialEngine.exe'
$stream = [IO.File]::OpenRead($exe)
try {
    $reader = New-Object IO.BinaryReader($stream)
    if ($reader.ReadUInt16() -ne 0x5A4D) { throw 'Release executable is not a PE file.' }
    $stream.Position = 0x3C
    $offset = $reader.ReadInt32()
    $stream.Position = $offset
    if ($reader.ReadUInt32() -ne 0x4550 -or $reader.ReadUInt16() -ne 0x8664) { throw 'Release executable must be Windows x64.' }
} finally { $stream.Dispose() }
if (@(Get-ChildItem $ReleaseDir -Filter '*.dll' -File).Count -gt 0) {
    throw 'Unexpected app-local DLLs: review dependencies and update the explicit packaging inventory before distributing.'
}
if (@(Get-ChildItem (Join-Path $ReleaseDir 'ui') -Recurse -File | Where-Object { $_.Extension -in @('.pdb', '.obj', '.exe', '.dll') }).Count -gt 0) {
    throw 'Unexpected binary/intermediate files in bundled UI.'
}
# Validate canonical resources before removing the fixed, repository-owned staging path.
$icon = Join-Path $RepoRoot 'assets/branding/icons/miyazato-spatial-engine.ico'
$presets = @(Get-ChildItem (Join-Path $RepoRoot 'domain/presets') -Filter '*.json' -File)
if (-not (Test-Path $icon) -or $presets.Count -eq 0) { throw 'Official icon or preset resources missing.' }
foreach ($path in @((Join-Path $RepoRoot 'dist'), (Split-Path $stage), $stage)) {
    if (Test-Path $path) {
        if ((Get-Item $path -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) {
            throw "Refusing staging through a reparse point: $path"
        }
    }
}
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item $stage -ItemType Directory -Force | Out-Null
Copy-Item $exe $stage
Copy-Item (Join-Path $ReleaseDir 'ui') $stage -Recurse
New-Item (Join-Path $stage 'assets/branding/icons') -ItemType Directory -Force | Out-Null
Copy-Item $icon (Join-Path $stage 'assets/branding/icons')
New-Item (Join-Path $stage 'presets') -ItemType Directory -Force | Out-Null
$presets | Copy-Item -Destination (Join-Path $stage 'presets')
foreach ($relative in $required + @('assets/branding/icons/miyazato-spatial-engine.ico', 'presets')) {
    if (-not (Test-Path (Join-Path $stage $relative))) { throw "Staging verification failed: $relative" }
}
$portable = Join-Path $RepoRoot 'dist/windows/portable'
New-Item $portable -ItemType Directory -Force | Out-Null
$zip = Join-Path $portable "MiyazatoSpatialEngine-$(Get-AppVersion)-portable.zip"
Compress-Archive -Path "$stage/*" -DestinationPath $zip -Force
if (-not (Test-Path $zip)) { throw 'Portable ZIP was not created.' }
Write-Host "Staged runtime: $stage"
Write-Host "Portable ZIP: $zip"
