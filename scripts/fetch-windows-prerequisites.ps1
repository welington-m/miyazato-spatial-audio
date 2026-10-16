[CmdletBinding()]
param([switch]$Refresh)
. "$PSScriptRoot/windows-distribution-common.ps1"
Assert-Windows
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$cache = Join-Path $RepoRoot 'installer/windows/prerequisites'
New-Item $cache -ItemType Directory -Force | Out-Null
$downloads = @{
    'MicrosoftEdgeWebview2Setup.exe' = 'https://go.microsoft.com/fwlink/p/?LinkId=2124703'
    'vc_redist.x64.exe' = 'https://aka.ms/vc14/vc_redist.x64.exe'
}
foreach ($name in $downloads.Keys) {
    $target = Join-Path $cache $name
    if ($Refresh -or -not (Test-Path $target)) {
        $temporary = "$target.download"
        try {
            Invoke-WebRequest -Uri $downloads[$name] -OutFile $temporary -UseBasicParsing
            Assert-MicrosoftInstaller $temporary
            Move-Item $temporary $target -Force
        } finally { if (Test-Path $temporary) { Remove-Item $temporary -Force } }
    }
    Assert-MicrosoftInstaller $target
    Write-Host "$name SHA256: $((Get-FileHash $target -Algorithm SHA256).Hash)"
}
