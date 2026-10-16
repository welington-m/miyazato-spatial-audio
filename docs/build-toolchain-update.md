# Build Toolchain Update — 2026-10-10

Primary Windows build configuration is now Visual Studio 18 2026 / MSVC v145 / Windows 11 x64. Secondary Visual Studio 17 2022 / v143 configuration is retained. Runtime architecture, DSP, WASAPI, IPC, presets, persistence and frontend behavior are unchanged.

**Visual Studio 2026 build not verified in this environment.** Configuration preparation is complete; Windows build and runtime validation remain outstanding.

## Inspection before changes

Inspected all repository-owned CMake structure: the root `CMakeLists.txt` is the only CMake list; there were no nested lists, presets or toolchain files. Inspected `.github/workflows/build.yml`, `.gitignore`, `README.md`, `docs/build-windows.md`, `docs/third-party.md`, `docs/validation.md`, `docs/branding-integration.md`, `apps/desktop/native/main.cpp`, `app.rc`, `resource.h`, the canonical ICO, frontend `package.json`, lockfile, `.npmrc`, `vite.config.ts`, `scripts/sync-branding.mjs`, and `tests/DspTests.cpp`. No root scripts directory or existing Windows setup validator existed.

VS2022-specific assumptions reported before editing:

- README recommended Visual Studio 2022 or newer and did not explicitly select a generator.
- Windows CI used the `windows-2022` runner, an implicit generator and a shared `build/` output directory; only Release was tested.
- Windows build documentation mentioned 2022/2026 but required only CMake 3.24. VS2026 requires CMake 4.2 or newer, which introduced its generator.

No v143, generator-version-17, SDK patch version or fixed compiler path was hardcoded in the project. Existing MSVC flags are target-local `/W4`, `/permissive-`, and DSP `/fp:precise`; MSVC has no `/WX`. Non-MSVC warning policy is preserved. C++23, standard-required and extensions-off were already configured.

WebView2 uses extracted NuGet headers and `build/native/x64/WebView2LoaderStatic.lib`. The runtime is installed separately. CMake copies Vite dist beside the executable; the host maps that directory to `https://miyazato.local`. The resource uses the official ICO via a build-local copy and a relative `.rc` path. These integrations were preserved.

## Files changed and exact configuration changes

| File | Change |
|---|---|
| `CMakeLists.txt` | Existing SDK check now requires both `WebView2.h` and the x64 static loader, with a targeted configure error. |
| `CMakePresets.json` | New version-6 Windows-only configure/build/test presets for VS2026/x64/v145 and VS2022/x64/v143, with separate toolchain directories, Debug/Release selection and environment-supplied SDK path. |
| `.github/workflows/build.yml` | VS2026 and VS2022 matrix; CMake 4.2.3 tooling; both Debug/Release builds and tests; separate Release artifacts. Portable output moved to `build-linux/`. |
| `.gitignore` | Explicit root ignores for both Windows toolchain directories and `build-linux/`; existing `build*/` rule retained. |
| `README.md` | Primary requirements, explicit generator/SDK command, build/test commands and executable path. |
| `docs/build-windows.md` | Setup validation, direct commands, presets, secondary compatibility, dependencies, packaging and manual runtime checks. |
| `scripts/check-windows-build-env.ps1` | New read-only prerequisite checks with OK/WARNING/MISSING reports and nonzero exit for missing requirements. |
| `docs/build-toolchain-update.md` | This inspection/change/validation record. |

The project minimum CMake version remains **3.24**, preserving existing direct builds. Presets require **3.25** for schema version 6; VS2026 generator use requires **4.2+**. Generator and toolset choices stay outside `CMakeLists.txt`; no Windows SDK patch is pinned. C++23 settings and compiler flags are unchanged.

No dependency version changes: Catch2 3.7.1, nlohmann/json 3.11.3 and WebView2 SDK 1.0.2903.40 remain as before; npm manifests and lockfile are unchanged. CI's CMake 4.2.3 pin is a build-tool update. No source-code compatibility changes were needed or made.

The [CMake generator documentation](https://cmake.org/cmake/help/latest/generator/Visual%20Studio%2018%202026.html) documents the VS2026 generator and default v145 toolset. The [GitHub runner documentation](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job) lists `windows-2025-vs2026` and `windows-2022`. CI runner OS is Windows Server; it is compile/test coverage, not Windows 11 physical audio validation. Runtime discovery follows [Microsoft's WebView2 registry guidance](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution).

## Results actually executed

Environment: Ubuntu 22.04 Linux, GCC 11.4, Node 22.16.0, npm 10.9.2. CMake 4.2.3 and PowerShell 7.4.13 were unpacked under `/tmp`, without system installation. Catch2 3.7.1 was unpacked under `/tmp`; archive SHA256 matched the existing CMake pin. Portable builds used `FETCHCONTENT_SOURCE_DIR_CATCH2`.

| Check | Result |
|---|---|
| VS2026 configure | Attempted with the requested generator/x64 command; failed because Linux CMake has no Visual Studio generators. |
| VS2026 Debug build / tests | Not run; no Windows toolchain. |
| VS2026 Release build / tests | Not run; no Windows toolchain. |
| VS2022 Debug / Release | Not run; configuration compatibility retained, actual builds unverified. |
| Portable Debug build | Passed in `build-linux/debug`. |
| Portable Release build | Passed in `build-linux/release`. |
| Portable Debug / Release tests | Both CTest runs passed (one registered executable); each Catch2 run passed 11 cases and 356,567 assertions. |
| Frontend install | `npm install --prefix apps/desktop/ui --offline --cache /tmp/miyazato-npm-cache` passed without manifest/lockfile changes. |
| Frontend production build | `npm run build --prefix apps/desktop/ui` passed (TypeScript + Vite). |
| Frontend tests | `npm run test --prefix apps/desktop/ui`: nine tests passed in two files. |
| Branding packaging | All 23 canonical branding files matched production copies byte-for-byte. |
| Presets | CMake 4.2.3 parsed schema; Windows-only configure presets correctly hidden on Linux. Build/test presets listed. |
| Workflow | YAML parsed; both Windows toolchain matrix entries present. CI not executed here. |
| Setup script | PowerShell parser passed; non-Windows execution reported MISSING and exited 1 as designed. Windows detection branches unverified. |
| Whitespace / scope | `git diff --check` passed; no engine, domain, native source/resource, frontend source, dependency manifest or lockfile changes. |

A transient GNU Make clock-skew warning appeared during Release compilation; compilation/linking exited successfully and tests passed. No regression was found in executed checks. Windows regressions cannot be ruled out until Windows validation runs.

## Manual tests still required

On Windows 11 x64 with VS2026, execute Debug and Release configure/build/test commands in [build-windows.md](build-windows.md), then check application launch and normal close, WebView2 UI load, official window/taskbar/Explorer icon, branding resolution, WASAPI device enumeration, audio engine and DSP initialization, preset application and persistence reload. Test physical audio routing with supported distinct endpoints. Confirm the Microsoft resource compiler and static WebView2 loader compile/link successfully as part of the native host build.

Repeat compile/test and startup checks with VS2022/v143 to establish secondary compatibility. Run the setup script on Windows, including missing-prerequisite scenarios. Automated Linux DSP/frontend checks cannot verify the Windows host, resource compiler, WebView2 runtime, device access or physical audio behavior.
