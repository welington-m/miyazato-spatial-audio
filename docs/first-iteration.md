# First executable foundation

The starting README is the product brief and has been preserved. Implementation entry points:

- `CMakeLists.txt`: portable DSP, Catch2 tests and conditional Windows targets.
- `engine/core/`: processor contract, checked owned buffer / views and bounded SPSC.
- `domain/audio-profile/Profile.h`: portable parameter model.
- `engine/dsp/Dsp.h` / `Dsp.cpp`: real float DSP and snapshots.
- `engine/audio/wasapi/`: real enumeration and prototype routing source.
- `apps/desktop/native/main.cpp`: Win32, WebView2, IPC and AppData persistence.
- `apps/desktop/ui/src/`: responsive React frontend, profiles and host bridge.
- `tests/DspTests.cpp`: signal and queue tests.
- `docs/`: architecture, DSP, device limitations, Windows build and roadmap.

Follow [build-windows.md](build-windows.md) to build and launch. See [roadmap.md](roadmap.md) for ready/pending states and [third-party.md](third-party.md) for licensing.

## Repository layout

```text
miyazato-spatial-audio/
├── CMakeLists.txt
├── .clang-format
├── .github/workflows/build.yml
├── apps/desktop/
│   ├── native/main.cpp
│   └── ui/
│       ├── package.json + package-lock.json + .npmrc
│       ├── vite.config.ts + tsconfig.json
│       └── src/
│           ├── App.tsx + useAudioSession.ts + bridge.ts
│           ├── profile.ts + components.tsx + EQGraph.tsx
│           ├── screens/ (Home, EQ, Spatial, Devices, Advanced, Settings)
│           └── *.test.ts(x)
├── engine/
│   ├── core/ (AudioProcessor, AudioBuffer, SpscQueue)
│   ├── audio/ (wasapi, devices, buffers)
│   └── dsp/ (Dsp.h / Dsp.cpp + documented extension boundaries)
├── domain/
│   ├── audio-profile/Profile.h
│   ├── presets/ (Music, Movie, Gaming, FPS, Voice JSON)
│   └── devices/
├── infrastructure/ (windows, persistence)
├── tests/DspTests.cpp
├── assets/
└── docs/ (architecture, engine, DSP, UI, Windows build, roadmap, validation)
```

Folders for future processors contain explicit status documentation, not fictitious implementations. The currently implemented processors are consolidated in `Dsp.*` and can be extracted by algorithm as they grow. [Validation results](validation.md) record what actually compiled and ran.
