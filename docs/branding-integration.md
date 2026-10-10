# Official branding integration — 2026-10-10

## Inspection before changes

Native executable: `MiyazatoSpatialEngine` in root CMake; host at `apps/desktop/native/main.cpp`. UI entry: `apps/desktop/ui/src/main.tsx`. Existing sidebar: Lucide AudioLines plus text. Existing CSS: purple accent and near-black surfaces. Native title already correct. No favicon, resource file, splash startup flow, About screen or installer configuration existed. Settings screen was present. WebView2 maps bundled `ui/` to `https://miyazato.local` with same-origin CSP and CMake copies Vite dist.

The uploaded package was initially at `assets/{icons,logos,splash,brand}` and `assets/BRAND_GUIDELINES.md`. These files were moved unchanged into the requested canonical `assets/branding/`. Windows download metadata is retained in the source filesystem but ignored and excluded from generated copies.

## Files changed

- `CMakeLists.txt`: Windows RC language, official ICO build-local synchronization, executable resource and resource include directories.
- `apps/desktop/native/main.cpp`: official large/small window icons and WNDCLASSEX registration only.
- `apps/desktop/ui/package.json`: automated predev/prebuild branding synchronization.
- `apps/desktop/ui/tsconfig.json`: typed JSON imports for canonical brand tokens and existing package version.
- `apps/desktop/ui/index.html`: official favicon and generated theme stylesheet.
- `apps/desktop/ui/src/App.tsx`: official sidebar icon, app header identity, version from package.json.
- `apps/desktop/ui/src/screens/SettingsScreen.tsx`: official transparent logo, name, tagline and existing version.
- `apps/desktop/ui/src/styles.css`: theme aliases, branded surfaces/highlights/orb, official logo styles; layout and semantic error/success colors preserved.
- `apps/desktop/ui/src/EQGraph.tsx`: visual accent colors only; EQ response/editing logic unchanged.
- `.gitignore`: generated frontend asset copies and Windows metadata ignored; canonical images/ICO/JSON/Markdown remain eligible for version control.
- `README.md`, `assets/README.md`, `docs/ui-design.md`: canonical source and workflow documentation.

## Files created

- `apps/desktop/ui/scripts/sync-branding.mjs`
- `apps/desktop/ui/src/config/branding.ts`
- `apps/desktop/ui/src/BrandLogo.tsx`
- `apps/desktop/ui/src/SplashScreen.tsx`
- `apps/desktop/ui/src/vite-env.d.ts`
- `apps/desktop/native/resource.h` / `app.rc`
- This report and `docs/screenshots/branding-{home,settings}-preview.png`.

## Asset strategy

Node synchronizes canonical assets into ignored `apps/desktop/ui/public/branding/` before dev/build. It generates six `--mse-*` variables directly from canonical JSON, rejecting invalid color values. Vite includes public assets in dist. Frontend paths are centralized in `config/branding.ts` and respect Vite BASE_URL. HTML favicon/theme references resolve relatively in production. Original files are not edited, recolored or resized.

During a running dev session, rerun `npm run branding:sync --prefix apps/desktop/ui` after source edits or restart Vite. Generated copies are disposable; do not edit them manually. Repository source remains canonical.

SplashScreen is reusable but intentionally not wired into startup: no existing splash flow required replacement, and no startup delay was introduced. No installer exists to update.

## Windows resource

CMake copies `assets/branding/icons/miyazato-spatial-engine.ico` into the build-local `branding/` directory. Resource ID 101 uses a relative ICON path; resource compiler include directories locate it independently of working directory. Win32 loads resource 101 for window and small window icons. The existing title and identifiers remain unchanged.

The ICO contains valid 16, 24, 32, 48, 64, 128 and 256 pixel entries. GNU Windows windres compiled the resource from the repository root using a separate build directory; the resulting .res contains seven RT_ICON entries and RT_GROUP_ICON 101. This validates resource syntax/content, not the full MSVC executable or Windows taskbar behavior.

## Validation results

- Production TypeScript/Vite build passed with automated asset synchronization.
- All 23 official files compared byte-for-byte with production copies.
- Nine existing UI tests passed.
- CMake portable Release build and eleven C++ tests passed.
- Chromium production preview at `/index.html`: 1920×1080, 1366×768, 800×900 and 3840×2160. Official images, favicon, title, exact electric lime token, Settings identity and EQ navigation passed; no console/page errors or horizontal overflow.
- Chromium development preview also passed the same four resolutions and identity/asset checks without errors.
- Canonical main icon, transparent logo and token JSON are not ignored by Git.
- Formatting and whitespace checks passed.
- All existing `engine/` and `domain/` files checked against a pre-edit SHA-256 manifest: no changes. DSP, WASAPI, buffer/processor contracts, DSPChain, device enumeration, preset semantics and IPC contracts were not modified.

Native desktop configuration was attempted and rejected by the expected `Desktop host requires Windows` guard in this Linux environment. Full native compilation, Explorer/taskbar icon inspection and actual WebView2 asset loading remain Windows validation tasks. No claim is made that those checks ran here.

## Commands

```sh
npm run build --prefix apps/desktop/ui
npm test --prefix apps/desktop/ui
cmake -S . -B build -DMIYAZATO_BUILD_DESKTOP=OFF
cmake --build build -j 4
ctest --test-dir build --output-on-failure
```

For Windows: build the UI first, then follow `docs/build-windows.md` with WEBVIEW2_SDK_DIR. The existing Windows CI job builds this resource as part of the executable.
