# Windows build and run

Requirements: Windows 11 x64; Visual Studio 2022 or 2026 with Desktop development with C++, Windows 11 SDK and C++23 support; CMake ≥3.24; Node ≥22.12; Microsoft Edge WebView2 Runtime. Build with an x64 Developer PowerShell. ARM64/x86 are not configured.

Download Microsoft.Web.WebView2 **1.0.2903.40** from NuGet and extract it to a local directory such as `C:/SDK/WebView2`. The folder must contain `build/native/include/WebView2.h` and `build/native/x64/WebView2LoaderStatic.lib`. SDK and runtime are separate requirements. Catch2 3.7.1 and nlohmann/json 3.11.3 are fetched during CMake configuration; internet access is required on first configure. Use `FETCHCONTENT_SOURCE_DIR_CATCH2` / `FETCHCONTENT_SOURCE_DIR_JSON` for audited offline source trees.

```powershell
npm ci --prefix apps/desktop/ui
npm run build --prefix apps/desktop/ui
cmake -S . -B build -A x64 -DWEBVIEW2_SDK_DIR=C:/SDK/WebView2
cmake --build build --config Release
ctest --test-dir build -C Release --output-on-failure
npm test --prefix apps/desktop/ui
./build/Release/MiyazatoSpatialEngine.exe
```

Vite dist is copied next to the executable as `ui/` after linking. Run the UI build before CMake build. If only UI changed, run the CMake build again to refresh copied assets (the target always copies the UI directory). Deploy the whole executable directory, not the EXE alone. Missing UI/runtime produces a startup error. No installer or signing is supplied yet.

For UI development / browser preview:

```powershell
npm run dev --prefix apps/desktop/ui
```

Open the printed localhost URL. This preview has no WASAPI connection and persists to localStorage. Build/launch the native host for real device data and prototype routing.

Portable DSP validation on Linux:

```sh
cmake -S . -B build -DMIYAZATO_BUILD_DESKTOP=OFF -DCMAKE_BUILD_TYPE=Release
cmake --build build -j 4
ctest --test-dir build --output-on-failure
```

Linux builds do not compile native Windows files. This iteration was created on Linux; Windows host build and physical audio validation have not run. A Windows GitHub Actions workflow is included for repeatable compile/test validation, but has not been executed here.
