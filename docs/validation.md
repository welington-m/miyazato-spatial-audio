# Validation — 2026-10-10

Environment: Linux / WSL2, GCC 11.4, C++23, Node 22.16.0. CMake 3.31.6 was downloaded to `/tmp` because CMake was absent and sudo installation required an unavailable password. Catch2 3.7.1 was downloaded to `/tmp` and provided using `FETCHCONTENT_SOURCE_DIR_CATCH2` for local builds.

## Results

- CMake Release portable DSP build: passed with `-Wall -Wextra -Wpedantic -Werror`.
- Catch2: **11 test cases, 356,567 assertions passed**. Buffer validation, gain smoothing, limiter channel linking/non-finite handling, EQ center response at 44.1/48/96 kHz, extreme filter edits, chain overload/bypass/analyzer, queue saturation and 100,000 ordered messages between threads, compressor reduction, profile range rejection and selective bass response.
- AddressSanitizer + UndefinedBehaviorSanitizer Debug build and CTest: passed. LeakSanitizer cannot run under the restricted environment's ptrace; the test was rerun outside that sandbox successfully.
- `npm ci --prefix apps/desktop/ui --offline`: passed outside the sandbox (esbuild's validation subprocess was blocked inside it). `.npmrc` preserves the peer-resolution alternative needed after npm 10.9.2's resolver failed internally.
- `npm run build --prefix apps/desktop/ui`: strict TypeScript and production Vite build passed.
- Vitest + React Testing Library: **9 tests passed**. Preset validation, malformed persistence fallback, range rejection, mode selection, keyboard EQ/bypass, honest browser output state, independent A/B settings, custom preset recall, continuous parameter delivery under React StrictMode.
- `npm audit`: zero reported vulnerabilities after upgrading Vite/Vitest.
- Chromium headless: Home and EQ rendered at **1920×1080, 2560×1440, 3840×2160, 1366×768, 800×900**; no horizontal overflow or console/page errors. Screenshots in `docs/screenshots/` are browser previews, not proof of Windows audio processing.
- C++ formatted with clang-format 15; frontend formatted with Prettier.
- `git diff --check`: passed.

## Not validated

Windows native host compilation, WebView2 runtime startup, WASAPI physical playback/loopback, endpoint recovery, Windows allocation traces, long-session drift, CPU/GPU budget, end-to-end latency, subjective quality, screen-reader usability and 192 kHz. No Windows executable has been produced in this Linux run. The Windows workflow is provided but has not been run here. No <10 ms latency claim is made.

## Repeatable commands

```sh
cmake -S . -B build -DMIYAZATO_BUILD_DESKTOP=OFF -DCMAKE_BUILD_TYPE=Release
cmake --build build -j 4
ctest --test-dir build --output-on-failure
npm ci --prefix apps/desktop/ui
npm run build --prefix apps/desktop/ui
npm test --prefix apps/desktop/ui
npm run format:check --prefix apps/desktop/ui
```

For native desktop requirements and build commands, follow [build-windows.md](build-windows.md).
