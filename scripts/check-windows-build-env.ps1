# Read-only checks. Supports Windows PowerShell 5.1 and PowerShell 7.
[CmdletBinding()]
param([string]$WebView2SdkDir = $env:WEBVIEW2_SDK_DIR)
$missing = 0
function Report([string]$Status, [string]$Message) {
    Write-Output "[$Status] $Message"
    if ($Status -eq 'MISSING') { $script:missing++ }
}
function Check-Command([string]$Name, [string[]]$Arguments, [version]$Minimum) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Report MISSING "$Name is not on PATH"
        return
    }
    try {
        $output = & $Name @Arguments 2>&1
        if ($LASTEXITCODE -ne 0) { throw "$Name exited with $LASTEXITCODE" }
        $line = [string]($output | Select-Object -First 1)
        $match = [regex]::Match($line, '\d+\.\d+\.\d+')
        if ($Minimum -and (-not $match.Success -or [version]$match.Value -lt $Minimum)) {
            Report MISSING "$Name requires $Minimum or newer; detected $line"
        } else { Report OK "$Name detected: $line" }
    } catch { Report MISSING "$Name could not run: $_" }
}
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
    Report MISSING 'Windows 11 x64 required; this host is not Windows'
    exit 1
}
try {
    $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
    if ($os.Caption -match 'Windows 11' -and [int]$os.BuildNumber -ge 22000) {
        Report OK "$($os.Caption), build $($os.BuildNumber)"
    } else { Report WARNING "Primary target is Windows 11; detected $($os.Caption)" }
    if ([Environment]::GetEnvironmentVariable('PROCESSOR_ARCHITECTURE', 'Machine') -eq 'AMD64') {
        Report OK 'x64 host detected'
    } else { Report WARNING 'Official desktop target is x64; host architecture differs' }
} catch { Report WARNING "Windows version could not be read: $_" }
Check-Command cmake @('--version') ([version]'4.2.0')
Check-Command node @('--version') ([version]'22.12.0')
Check-Command npm @('--version') $null
Check-Command git @('--version') $null
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
$instances = @()
if (Test-Path $vswhere) {
    try {
        $raw = & $vswhere -products '*' -version '[18.0,19.0)' -format json
        if ($LASTEXITCODE -ne 0) { throw 'vswhere failed' }
        $instances = @($raw | ConvertFrom-Json)
    } catch { Report WARNING "Visual Studio discovery failed: $_" }
} else { Report MISSING 'vswhere is missing; Visual Studio Installer is required for discovery' }
if ($instances.Count -eq 0) {
    Report MISSING 'Visual Studio 2026 (18.x) not detected'
    Report MISSING 'MSVC v145 x64 tools not detected in Visual Studio 2026'
} else {
    $tools = @()
    foreach ($instance in $instances) {
        Report OK "Visual Studio 2026 detected: $($instance.displayName) $($instance.installationVersion)"
        $root = Join-Path $instance.installationPath 'VC/Tools/MSVC'
        $tools += @(Get-ChildItem $root -Directory -ErrorAction SilentlyContinue | Where-Object {
            $_.Name -match '^14\.5\d\.' -and
            (Test-Path (Join-Path $_.FullName 'bin/Hostx64/x64/cl.exe')) -and
            (Test-Path (Join-Path $_.FullName 'lib/x64/libcmt.lib'))
        })
    }
    if ($tools.Count -gt 0) {
        Report OK "MSVC v145 x64 tools detected: $(($tools.Name | Sort-Object -Unique) -join ', ')"
    } else { Report MISSING 'MSVC v145 x64 compiler/libraries missing; select Desktop development with C++' }
}
try {
    $kits = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows Kits\Installed Roots' -ErrorAction Stop
    $sdkRoot = $kits.KitsRoot10
    $sdks = @(Get-ChildItem (Join-Path $sdkRoot 'Include') -Directory -ErrorAction Stop | Where-Object {
        $_.Name -match '^10\.0\.\d+\.0$' -and [version]$_.Name -ge [version]'10.0.22000.0' -and
        (Test-Path (Join-Path $_.FullName 'um/Windows.h')) -and
        (Test-Path (Join-Path $sdkRoot "Lib/$($_.Name)/um/x64/kernel32.lib")) -and
        (Test-Path (Join-Path $sdkRoot "bin/$($_.Name)/x64/rc.exe"))
    })
    if ($sdks.Count -gt 0) { Report OK "Windows 11 SDK detected: $(($sdks.Name | Sort-Object) -join ', ')" }
    else { Report MISSING 'Windows 11 SDK headers, x64 libraries and resource compiler not detected' }
} catch { Report MISSING "Windows SDK could not be detected: $_" }
$runtimeId = '{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
$runtimeVersions = @()
foreach ($key in @(
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\$runtimeId",
    "HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\$runtimeId",
    "HKCU:\SOFTWARE\Microsoft\EdgeUpdate\Clients\$runtimeId"
)) {
    $value = (Get-ItemProperty $key -Name pv -ErrorAction SilentlyContinue).pv
    $parsed = $null
    if ($value -and [version]::TryParse([string]$value, [ref]$parsed) -and $parsed -gt [version]'0.0.0.0') {
        $runtimeVersions += $value
    }
}
if ($runtimeVersions.Count -gt 0) { Report OK "WebView2 Runtime detected: $(($runtimeVersions | Sort-Object -Unique) -join ', ')" }
else { Report MISSING 'Evergreen WebView2 Runtime not detected in machine/user registry' }
if ($WebView2SdkDir -and
    (Test-Path (Join-Path $WebView2SdkDir 'build/native/include/WebView2.h')) -and
    (Test-Path (Join-Path $WebView2SdkDir 'build/native/x64/WebView2LoaderStatic.lib'))) {
    Report OK "WebView2 SDK headers and x64 static loader detected: $WebView2SdkDir"
} else { Report MISSING 'Set WEBVIEW2_SDK_DIR or -WebView2SdkDir to the extracted WebView2 SDK' }
if ($missing -gt 0) { exit 1 }
exit 0
