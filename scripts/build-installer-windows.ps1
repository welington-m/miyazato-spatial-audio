[CmdletBinding()]
param([string]$WebView2SdkDir = $env:WEBVIEW2_SDK_DIR, [string]$IsccPath)
. "$PSScriptRoot/windows-distribution-common.ps1"
Assert-Windows
if (-not $WebView2SdkDir) { throw 'Set WEBVIEW2_SDK_DIR or pass -WebView2SdkDir.' }
$env:WEBVIEW2_SDK_DIR = (Resolve-Path $WebView2SdkDir).Path
if (-not $IsccPath) {
    $command = Get-Command ISCC.exe -ErrorAction SilentlyContinue
    if ($command) { $IsccPath = $command.Source }
    else {
        foreach ($base in @(${env:ProgramFiles(x86)}, $env:ProgramFiles, $env:LOCALAPPDATA)) {
            if ($base) {
                $candidate = Join-Path $base 'Inno Setup 6/ISCC.exe'
                if (Test-Path $candidate) { $IsccPath = $candidate; break }
            }
        }
    }
}
if (-not $IsccPath -or -not (Test-Path $IsccPath -PathType Leaf)) {
    throw 'Inno Setup 6 is required to build the Windows installer. Use -IsccPath for a custom installation.'
}
$IsccPath = (Resolve-Path $IsccPath).Path
Push-Location $RepoRoot
try {
    Push-Location 'apps/desktop/ui'
    try {
        Invoke-Checked npm.cmd @('ci')
        Invoke-Checked npm.cmd @('run', 'test')
        Invoke-Checked npm.cmd @('run', 'build')
    } finally { Pop-Location }
    Invoke-Checked cmake @('--preset', 'windows-vs2026-release')
    Invoke-Checked cmake @('--build', '--preset', 'windows-vs2026-release')
    Invoke-Checked ctest @('--preset', 'windows-vs2026-release')
    # Future signing point: sign the Release application executable before staging.
    & "$PSScriptRoot/package-windows.ps1"
    & "$PSScriptRoot/fetch-windows-prerequisites.ps1" -Refresh
    $redist = Join-Path $RepoRoot 'installer/windows/prerequisites/vc_redist.x64.exe'
    $versionMatch = [regex]::Match((Get-Item $redist).VersionInfo.ProductVersion, '\d+\.\d+\.\d+\.\d+')
    if (-not $versionMatch.Success) { throw 'Cannot read VC++ Redistributable version.' }
    $vcVersion = [version]$versionMatch.Value
    # CMake records the compiler under the selected MSVC tools directory (14.xx.xxxxx).
    $cache = Get-Content 'build-windows-vs2026/CMakeCache.txt' -Raw
    $compiler = [regex]::Match($cache, 'CMAKE_CXX_COMPILER:FILEPATH=.*[/\\]MSVC[/\\](\d+\.\d+\.\d+)')
    if (-not $compiler.Success) { throw 'Cannot verify selected MSVC runtime version from CMake cache.' }
    if ($vcVersion -lt [version]$compiler.Groups[1].Value) { throw 'Downloaded VC++ runtime is older than the selected MSVC tools.' }
    $version = Get-AppVersion
    $output = Join-Path $RepoRoot "dist/windows/installer/MiyazatoSpatialEngine-Setup-$version.exe"
    if (Test-Path $output) { Remove-Item $output -Force }
    Invoke-Checked $IsccPath @("/DAppVersion=$version", "/DVcMinimumVersion=$vcVersion", 'installer/windows/MiyazatoSpatialEngine.iss')
    if (-not (Test-Path $output -PathType Leaf)) { throw 'Inno Setup did not produce the expected installer.' }
    # Future signing point: sign the completed installer executable here.
    Write-Host "Installer: $output"
    Write-Host "Portable: $(Join-Path $RepoRoot "dist/windows/portable/MiyazatoSpatialEngine-$version-portable.zip")"
} finally { Pop-Location }
