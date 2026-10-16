# Windows build and run

Primary development target: Windows 11 x64, Visual Studio Community 2026 with **Desktop development with C++**, MSVC **v145**, an installed Windows 11 SDK, **CMake 4.2+**, Node.js LTS (at least 22.12), npm, Git and Microsoft Edge WebView2 Runtime. The project uses C++23 without language extensions. Visual Studio 2022 / v143 remains a secondary compatibility target; its direct configure command requires CMake 3.24+, or 3.25+ for the version-6 presets.

CMake 4.2 added the [Visual Studio 18 2026 generator](https://cmake.org/cmake/help/latest/generator/Visual%20Studio%2018%202026.html); its default toolset is v145. Older CMake bundled with an IDE may need a separate update. Use `cmake --version` and `cmake --help` to confirm the executable on PATH. No SDK patch version or compiler installation path is pinned: Visual Studio/CMake selects an installed compatible SDK. Use x64 PowerShell; x86/ARM desktop builds are not supported.

## Prepare and check dependencies

Download Microsoft.Web.WebView2 **1.0.2903.40** from NuGet and extract it to a local directory such as `C:/SDK/WebView2`. The folder must contain `build/native/include/WebView2.h` and `build/native/x64/WebView2LoaderStatic.lib`. SDK and runtime are separate requirements. The existing static loader integration is retained; no separate WebView2Loader DLL is packaged. Install the Evergreen WebView2 Runtime for application startup.

Catch2 **3.7.1** and nlohmann/json **3.11.3** are fetched during CMake configuration; internet access is required on first configure. Use `FETCHCONTENT_SOURCE_DIR_CATCH2` / `FETCHCONTENT_SOURCE_DIR_JSON` for audited offline source trees. No dependency versions changed for this migration.

From the repository root:

```powershell
$env:WEBVIEW2_SDK_DIR = 'C:/SDK/WebView2'
./scripts/check-windows-build-env.ps1
npm install --prefix apps/desktop/ui
npm run build --prefix apps/desktop/ui
npm run test --prefix apps/desktop/ui
```

The validation script installs nothing and reports `[OK]`, `[WARNING]` or `[MISSING]`; missing prerequisites cause exit code 1. It discovers VS2026 installations using vswhere, checks v145 x64 compiler/libraries, SDK headers/libraries/resource compiler, commands and machine/user Evergreen runtime registry entries. It also checks the extracted SDK. These presence checks do not prove compiler compatibility or application startup. CI uses `npm ci` to preserve the lockfile.

## Visual Studio 2026

```powershell
cmake -S . -B build-windows-vs2026 -G "Visual Studio 18 2026" -A x64 -DWEBVIEW2_SDK_DIR="$env:WEBVIEW2_SDK_DIR"
cmake --build build-windows-vs2026 --config Debug
ctest --test-dir build-windows-vs2026 -C Debug --output-on-failure
cmake --build build-windows-vs2026 --config Release
ctest --test-dir build-windows-vs2026 -C Release --output-on-failure
./build-windows-vs2026/Release/MiyazatoSpatialEngine.exe
```

After the SDK path is cached, the official configure command can be rerun as:

```powershell
cmake -S . -B build-windows-vs2026 -G "Visual Studio 18 2026" -A x64
```

Equivalent reproducible presets explicitly select x64/v145 and read `WEBVIEW2_SDK_DIR` from the environment:

```powershell
cmake --preset windows-vs2026
cmake --build --preset windows-vs2026-debug
ctest --preset windows-vs2026-debug
cmake --build --preset windows-vs2026-release
ctest --preset windows-vs2026-release
```

Configure presets `windows-vs2026-debug` and `windows-vs2026-release` are also available. Visual Studio is a multi-configuration generator: Debug and Release share the toolchain directory; build/test presets select the configuration. Do not set `CMAKE_BUILD_TYPE` for Visual Studio.

## Visual Studio 2022 compatibility

Keep a separate cache and output tree:

```powershell
cmake -S . -B build-windows-vs2022 -G "Visual Studio 17 2022" -A x64 -DWEBVIEW2_SDK_DIR="$env:WEBVIEW2_SDK_DIR"
cmake --build build-windows-vs2022 --config Debug
ctest --test-dir build-windows-vs2022 -C Debug --output-on-failure
cmake --build build-windows-vs2022 --config Release
ctest --test-dir build-windows-vs2022 -C Release --output-on-failure
```

The matching `windows-vs2022`, `windows-vs2022-debug` and `windows-vs2022-release` presets select v143. Keep VS2022 updated for C++23 support. Do not reuse Linux or another generator's build directory.

## Packaging and runtime validation

Vite dist is copied next to the executable as `ui/` after linking. Build the UI before the native build; rerun the CMake build after UI edits to refresh copied assets. Deploy the whole executable directory. Missing UI/runtime produces a startup error. No installer or signing is supplied yet.

CMake copies the official `assets/branding/icons/miyazato-spatial-engine.ico` into the build-local `branding/` directory; `app.rc` retains a relative resource path. A successful Windows native build must compile this resource. Check Explorer, taskbar and window icons manually.

For each Windows toolchain/configuration, launch the application and check:

- WebView2 UI, logos, favicon and branding assets load.
- WASAPI devices enumerate; the audio engine and DSP chain initialize with distinct supported source/output endpoints.
- Presets apply and persisted settings reload after restarting.
- Audio start/stop works and the application closes normally.

Automated DSP/frontend tests cannot establish these physical audio/runtime results. The CI matrix compiles and tests Debug and Release on VS2026 and VS2022 and publishes Release EXE/UI artifacts. Its Windows Server runners do not establish Windows 11 physical audio behavior. See [migration validation](build-toolchain-update.md) for checks actually executed.

For UI browser preview, `npm run dev --prefix apps/desktop/ui` has no WASAPI connection and persists to localStorage.

## Portable DSP validation on Linux

```sh
cmake -S . -B build-linux -DMIYAZATO_BUILD_DESKTOP=OFF -DCMAKE_BUILD_TYPE=Release
cmake --build build-linux -j 4
ctest --test-dir build-linux --output-on-failure
```

Linux builds do not compile native Windows files. **Visual Studio 2026 build not verified in this environment.**
