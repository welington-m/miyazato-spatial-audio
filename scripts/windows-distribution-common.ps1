Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path $PSScriptRoot -Parent
function Assert-Windows {
    if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
        throw 'Windows is required to package the Windows desktop application.'
    }
}
function Get-AppVersion {
    $cmake = Get-Content (Join-Path $RepoRoot 'CMakeLists.txt') -Raw
    $match = [regex]::Match($cmake, 'project\(MiyazatoSpatialEngine\s+VERSION\s+(\d+\.\d+\.\d+)')
    if (-not $match.Success) { throw 'Cannot read project version from CMakeLists.txt.' }
    return $match.Groups[1].Value
}
function Invoke-Checked([string]$Command, [string[]]$Arguments) {
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Command failed with exit code $LASTEXITCODE" }
}
function Assert-MicrosoftInstaller([string]$Path) {
    if (-not (Test-Path $Path -PathType Leaf)) { throw "Missing prerequisite: $Path" }
    $signature = Get-AuthenticodeSignature -FilePath $Path
    if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'O=Microsoft Corporation(?:,|$)') {
        throw "Prerequisite must have a valid Microsoft Authenticode signature: $Path"
    }
}
