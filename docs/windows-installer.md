# Windows distribution

Status: packaging implementation added; Windows Release build, PowerShell execution,
Inno compilation, generated artifacts, and clean-machine installation have **not**
been verified in this Linux workspace. Do not publish until the checks below pass.

## Inspected runtime inventory

The authoritative version is `project(... VERSION 0.1.0 ...)` in `CMakeLists.txt`.
The frontend package version currently agrees. No Windows Release output or existing
root `dist/` was present during inspection; only Linux build trees were available.
Existing scripts contained `check-windows-build-env.ps1`; `.gitignore` already
excluded build trees, frontend dependencies and generated `dist/` directories.

The current CMake target links the DSP/Windows libraries and JSON into
`MiyazatoSpatialEngine.exe`. It links `WebView2LoaderStatic.lib`, so there is no
`WebView2Loader.dll` to ship. System Windows DLLs are supplied by Windows.
CMake's default MSVC Release CRT is dynamic (`/MD`): the x64 VC++ v14
Redistributable is required. No CRT linkage setting is changed by packaging.
If dependencies change, review and update the explicit staging inventory; unexpected
app-local DLLs currently cause packaging to fail instead of silently omitting them.

Staged files are:

- `MiyazatoSpatialEngine.exe` from the verified Release output.
- `ui/` from the same output, including `index.html`, Vite bundles in `assets/`,
  and synchronized official branding in `branding/`.
- `assets/branding/icons/miyazato-spatial-engine.ico`, from canonical branding.
- `presets/*.json`, from `domain/presets/` (fps, gaming, movie, music, voice).

Presets are included as distribution resources; packaging does not change how the
application currently selects or applies presets. No configuration templates or
other external runtime resources were found. Settings and the WebView2 cache already
use `%APPDATA%\MiyazatoSpatialEngine\`, which remains writable with a Program Files
installation. There is no repository license file; the license page is enabled
if a root `LICENSE` is added. PDBs, tests and build intermediates are excluded.

## Developer prerequisites and build

Use Windows 11 x64, Visual Studio 18 2026 with MSVC v145 and Windows SDK,
CMake 4.2+, Node.js 22.12+ and npm, and an extracted Microsoft WebView2 SDK.
See [native build setup](build-windows.md). Install Inno Setup **6.3 or newer**
from [the official website](https://jrsoftware.org/isinfo.php); the architecture
identifiers and version helpers in this script require a recent Inno Setup 6.
Developer tools are never installed automatically.

From the repository root:

```powershell
$env:WEBVIEW2_SDK_DIR = 'C:\SDKs\Microsoft.Web.WebView2'
powershell -ExecutionPolicy Bypass -File scripts/build-installer-windows.ps1
```

Use `-WebView2SdkDir` or `-IsccPath 'C:\Tools\Inno Setup 6\ISCC.exe'` to
specify nonstandard paths. Compiler discovery checks PATH and standard Program Files
locations, plus LocalAppData. Missing tools fail with clear errors.

The build runs `npm ci`, frontend tests and production build, the existing
`windows-vs2026-release` configure/build/test presets, staging and portable ZIP,
fresh prerequisite downloads, then ISCC. Any failed command stops distribution.
CMake and application source files remain unchanged. Existing portable Release
build commands continue to work.

Standalone packaging of an already built and tested Release output:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/package-windows.ps1
# Optional alternate verified Release directory:
powershell -ExecutionPolicy Bypass -File scripts/package-windows.ps1 -ReleaseDir C:\build\Release
powershell -ExecutionPolicy Bypass -File scripts/fetch-windows-prerequisites.ps1
```

Standalone staging validates the runtime layout and x64 PE header; it does not
replace running Release tests or prove that an executable was compiled in Release.
Only the fixed repository staging folder is removed; reparse points are rejected.
The portable ZIP has the application executable and runtime directories at its root.
Portable users must have WebView2 and VC++ runtimes installed separately.

## Installer and prerequisites

`installer/windows/MiyazatoSpatialEngine.iss` consumes only `dist/windows/app/`
for application files. The build supplies version metadata from CMake and a VC++
minimum version from the authenticated prerequisite's product version. It also
checks that this runtime is at least as recent as the selected MSVC tool directory.
This conservative minimum may update an older runtime even if it could run the app.

`fetch-windows-prerequisites.ps1` downloads only:

- `MicrosoftEdgeWebview2Setup.exe` from
  `https://go.microsoft.com/fwlink/p/?LinkId=2124703`.
- `vc_redist.x64.exe` from `https://aka.ms/vc14/vc_redist.x64.exe`.

Downloads must have valid Microsoft Authenticode signatures; partial downloads
are removed, cached files are revalidated, and SHA256 hashes are printed for
release records. Binaries live in ignored `installer/windows/prerequisites/`.
The orchestrator refreshes the cache each build. For reproducible future releases,
archive these validated versions and hashes in the release system.

Both prerequisites are embedded as temporary setup files. The Evergreen
bootstrapper downloads its runtime from Microsoft during installation, so users
need internet access when WebView2 is absent. This is an online beta installer,
not a bundled fixed WebView2 runtime.

WebView2 detection reads valid nonzero `pv` versions in machine EdgeUpdate Clients
registry views for `{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}`. Per-user HKCU detection
is deliberately not sufficient for this all-users installer: an elevated process
may belong to a different administrator. If only a user runtime exists, setup
ensures a machine runtime is present. The official bootstrapper runs elevated
with `/silent /install`, waits for completion, and registry detection is repeated.
See [Microsoft WebView2 distribution guidance](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution).

VC++ detection reads `Installed=1` and `Version` in
`SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64` in both machine views.
Missing or older versions invoke `/install /quiet /norestart`. Detection is repeated;
failures stop installation before application files are installed. Exit code 3010
requests a reboot at completion and suppresses launch until then; other nonzero
codes produce clear errors. No prerequisite is allowed to restart automatically.
See [Microsoft runtime downloads](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist)
and [redistribution guidance](https://learn.microsoft.com/en-us/cpp/windows/redistributing-visual-cpp-files).

Setup defaults to `C:\Program Files\Miyazato Spatial Engine`, with a stable AppId,
Windows 11 x64 restriction, modern wizard, welcome/location/task/ready/progress/
completion pages, Start Menu shortcut and unchecked optional Desktop shortcut.
The canonical icon is used throughout. Completion offers unelevated app launch
except in silent mode or when a reboot is needed. Setup registers normal Windows
uninstall support; uninstall removes tracked application files and shortcuts,
preserves `%APPDATA%\MiyazatoSpatialEngine\`, and leaves shared runtimes installed.
There are no services, drivers, firewall changes or audio device configuration.

Future signing points are marked in the build script: sign the native executable
before staging/ZIP creation, and sign the installer after ISCC. Signing is currently
optional; no certificate is generated. Keep signing credentials outside the repo.

## Outputs and verification

- Staging: `dist/windows/app/`
- Installer: `dist/windows/installer/MiyazatoSpatialEngine-Setup-0.1.0.exe`
- Portable: `dist/windows/portable/MiyazatoSpatialEngine-0.1.0-portable.zip`

Names automatically follow the CMake version. Confirm Windows Release build,
frontend/native tests, ISCC compilation and artifact existence before claiming
installer build verification. Current Linux checks: frontend 9 tests pass and
production build passes; existing Linux Release DSP executable passes 11 cases
(356567 assertions). Native rebuild/CTest could not run because CMake/CTest were
unavailable; these results do not verify the Windows build. PowerShell and ISCC
were also unavailable. No Windows artifacts have been produced here.

## Clean-machine validation checklist

Use disposable Windows 11 x64 VMs without Visual Studio, CMake, Node.js, npm or Git.
Record OS version, installer hash, prerequisite versions and test results.

1. Test absent prerequisites, existing current prerequisites, and an older VC++
   runtime; verify installation versus skip/update behavior. Also test a per-user
   WebView2 installation and elevation using a different administrator.
2. Run setup with logging (`/LOG`); check offline/download failure produces a clear
   error and permits retry. Verify no automatic restart.
3. Verify default Program Files path, version/publisher/icon in Installed apps,
   Start Menu shortcut, unchecked Desktop default and selected Desktop shortcut.
4. Launch as a standard user through both shortcuts; verify UI/branding loads,
   devices enumerate and existing preset selection works. Confirm settings/cache
   are created under that user's AppData, not Program Files.
5. Restart if requested; confirm application still launches and settings persist.
6. Extract the portable ZIP into a user-writable folder and launch with runtimes
   present, without developer tools.
7. Test silent setup (`/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /LOG`) and failure
   exit codes; verify app is not launched and a reboot request is observable.
8. Install the same version again; check shortcuts, upgrade identity and settings.
9. Uninstall via Installed apps; verify application files and shortcuts removed,
   user settings/cache preserved, and shared runtimes left installed. Reinstall
   and verify settings remain usable.

After a successful Windows build but before VM validation, report:
“Installer build verified; clean-machine installation validation still required.”
