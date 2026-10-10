# Miyazato Spatial Engine

> High-performance real-time spatial audio processing engine for Windows.

Miyazato Spatial Engine is a Windows desktop audio processing application designed to deliver high-quality, low-latency sound enhancement for music, movies, gaming, voice, and general multimedia.

The project focuses on real-time DSP, spatial audio, parametric equalization, bass enhancement, dynamic processing, HRTF-based virtualization, audio visualization, and customizable listening profiles.

The long-term goal is to provide a premium spatial audio experience comparable in perception and usability to modern commercial audio enhancement suites, while relying only on original implementations, documented DSP techniques, and legally compatible technologies.

---

## Table of Contents

- [Overview](#overview)
- [Goals](#goals)
- [Key Features](#key-features)
- [Audio Profiles](#audio-profiles)
- [Architecture](#architecture)
- [DSP Pipeline](#dsp-pipeline)
- [Technology Stack](#technology-stack)
- [Windows Audio Integration](#windows-audio-integration)
- [Real-Time Requirements](#real-time-requirements)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Build](#build)
- [Running](#running)
- [Testing](#testing)
- [Configuration](#configuration)
- [Preset Format](#preset-format)
- [Performance Goals](#performance-goals)
- [Roadmap](#roadmap)
- [Current Status](#current-status)
- [Development Principles](#development-principles)
- [Legal and Trademark Notice](#legal-and-trademark-notice)
- [Contributing](#contributing)
- [License](#license)

---

# Overview

Miyazato Spatial Engine is a modular real-time audio processing platform for Windows.

It is designed to sit between the Windows audio subsystem and the final playback device, allowing audio to be analyzed and processed before reaching:

- Headphones
- Speakers
- USB DACs
- HDMI audio devices
- Bluetooth devices
- External audio interfaces

The engine is intended to support audio produced by applications such as:

- Games
- Web browsers
- YouTube
- Spotify
- VLC
- Discord
- Microsoft Teams
- Streaming platforms
- Media players
- Other Windows applications

The application combines a native C++ audio engine with a modern React-based desktop interface.

---

# Goals

The primary goals of the project are:

- High-quality real-time audio processing
- Low additional latency
- Stable operation under continuous use
- Modular DSP architecture
- Professional Windows audio integration
- Modern and responsive user interface
- Multiple optimized listening profiles
- Extensible spatial audio architecture
- Clear separation between UI and DSP
- Automated testing
- Maintainable production-quality code

The application is being developed as a real software product rather than a UI-only prototype.

---

# Key Features

## Real-Time Audio Processing

The audio engine is designed around real-time processing using 32-bit floating-point samples.

Planned and implemented modules include:

- Input gain
- Parametric equalizer
- Bass enhancement
- Stereo width control
- Crossfeed
- Dialogue enhancement
- Dynamic range compression
- Peak limiting
- Virtual surround
- HRTF processing
- Upmixing
- Spatial audio processing
- Audio metering
- Spectrum analysis

---

## Parametric Equalizer

The equalizer architecture supports multiple filter types including:

- Bell / Peak
- Low Shelf
- High Shelf
- Low Pass
- High Pass

Each band can control:

- Frequency
- Gain
- Q factor
- Filter type
- Enabled state

Initial implementation target:

```text
10-band parametric EQ
```

Future versions may support:

```text
20-band
31-band
Custom band count
```

---

## Bass Enhancement

The bass engine is designed to reinforce low-frequency content without relying solely on aggressive gain increases.

Controls include:

```text
Bass Level
Bass Frequency
Bass Intensity
```

The processing chain should maintain sufficient headroom to prevent clipping.

---

## Spatial Audio

The spatial processing architecture is designed to support:

```text
Stereo
Virtual 5.1
Virtual 7.1
Virtual 7.1.4
```

Future implementations may include:

- HRTF-based binaural rendering
- Virtual speaker positioning
- Distance simulation
- Height perception
- Room simulation
- Convolution processing
- Personalized HRTF profiles

---

## Dialogue Enhancement

Dialogue enhancement is intended to improve speech intelligibility in:

- Movies
- Streaming content
- Meetings
- Podcasts
- Voice communication

The module should use frequency-selective processing rather than simply increasing total output volume.

---

## Dynamic Processing

The project includes architecture for:

### Compressor

Parameters:

```text
Threshold
Ratio
Attack
Release
Makeup Gain
```

### Limiter

A safety limiter is positioned near the end of the DSP chain to reduce clipping risk.

Gain reduction can be visualized through the user interface.

---

## Audio Analyzer

The analyzer subsystem is designed to provide:

- FFT spectrum
- Waveform
- Peak level
- RMS level
- Left/right channel meters
- Channel activity
- Gain reduction

Frequency visualization target:

```text
20 Hz - 20 kHz
```

Analyzer calculations must not block the real-time audio callback.

---

# Audio Profiles

One of the main concepts of Miyazato Spatial Engine is profile-based audio processing.

Users can quickly select the type of content they are listening to.

## Main Profiles

```text
Music
Movies
Gaming
FPS
Voice
Streaming
Custom
```

---

## Music

Available preset targets:

```text
Balanced
Hi-Fi
Bass Boost
Vocal
Rock
Electronic
Hip-Hop
Jazz
Classical
Acoustic
```

---

## Movies

Available preset targets:

```text
Cinema
Action
Dialogue
Night Mode
Immersive
```

---

## Gaming

Available preset targets:

```text
Balanced
Immersive
RPG
Racing
Simulation
```

---

## FPS

FPS mode prioritizes positional perception and sound clarity.

Potential presets:

```text
Competitive
Tactical
Immersive
```

The goal of this mode is to improve perception of:

- Footsteps
- Direction
- Distance
- Environmental movement
- Positional sound cues

while reducing excessive frequency content that may mask useful spatial information.

---

## Voice

Potential presets:

```text
Meeting
Podcast
Dialogue
Voice Clarity
```

---

## Streaming

Potential presets:

```text
YouTube
Streaming Video
Live Stream
General
```

---

# Architecture

The application follows principles inspired by:

- Clean Architecture
- SOLID
- Dependency Inversion
- Separation of Concerns
- Modular DSP design

The system is divided into several layers.

```text
┌─────────────────────────────┐
│        React / UI           │
├─────────────────────────────┤
│     Application Layer       │
├─────────────────────────────┤
│        Domain Layer         │
├─────────────────────────────┤
│       DSP Engine            │
├─────────────────────────────┤
│       Audio Engine          │
├─────────────────────────────┤
│      Windows WASAPI         │
├─────────────────────────────┤
│     Windows Audio Stack     │
└─────────────────────────────┘
```

DSP code must remain independent from user-interface components.

React components must never implement audio processing logic.

---

# DSP Pipeline

The planned processing pipeline is:

```text
Windows Audio
      │
      ▼
Input Gain
      │
      ▼
DC Blocker
      │
      ▼
Parametric EQ
      │
      ▼
Bass Enhancement
      │
      ▼
Stereo Processing
      │
      ▼
Optional Upmix
      │
      ▼
HRTF / Spatializer
      │
      ▼
Dialogue Enhancement
      │
      ▼
Dynamic Range Compressor
      │
      ▼
Safety Limiter
      │
      ▼
Output Gain
      │
      ▼
Audio Output Device
```

Individual processors can be enabled or bypassed dynamically.

Parameter changes must be smoothed to avoid:

- Clicks
- Pops
- Zipper noise
- Sudden gain changes

---

# Technology Stack

## Native Audio Engine

```text
C++23
CMake
Windows Core Audio
WASAPI
```

Possible optimizations:

```text
SSE
AVX2
SIMD
```

Optimizations should only be introduced where benchmarks demonstrate measurable benefits.

---

## Desktop UI

```text
React
TypeScript
Vite
WebView2
```

The UI is designed as a modern dark audio workstation-style interface.

---

## Testing

C++:

```text
GoogleTest
```

or:

```text
Catch2
```

Frontend:

```text
Vitest
React Testing Library
```

---

# Windows Audio Integration

Initial Windows integration uses:

```text
WASAPI
```

The audio subsystem is responsible for:

- Device enumeration
- Default-device detection
- Device selection
- Sample-rate detection
- Channel-count detection
- Buffer handling
- Device reconnection
- Device-change notifications
- Audio callback scheduling
- Underrun detection
- Latency measurements

The architecture should allow later integration with:

```text
Windows Audio Processing Objects — APO
```

or potentially a dedicated virtual audio device.

Kernel-level driver development is not part of the initial MVP.

---

# Real-Time Requirements

The audio callback is considered a real-time execution path.

The following operations must be avoided inside the audio callback:

```text
Disk access
Network calls
Blocking mutexes
JSON serialization
Heavy logging
Frequent memory allocations
UI communication
Potentially blocking Windows APIs
```

Audio buffers should be preallocated whenever possible.

Communication between audio and control threads should use appropriate techniques such as:

- Atomics
- Lock-free queues
- Ring buffers
- Double buffering

---

# Project Structure

Recommended repository layout:

```text
miyazato-spatial-engine/
│
├── apps/
│   └── desktop/
│       ├── native/
│       └── ui/
│
├── engine/
│   ├── audio/
│   │   ├── buffers/
│   │   ├── devices/
│   │   └── wasapi/
│   │
│   ├── core/
│   │
│   └── dsp/
│       ├── analyzer/
│       ├── bass/
│       ├── compressor/
│       ├── equalizer/
│       ├── hrtf/
│       ├── limiter/
│       ├── spatializer/
│       ├── stereo/
│       └── upmixer/
│
├── domain/
│   ├── audio-profile/
│   ├── devices/
│   └── presets/
│
├── infrastructure/
│   ├── persistence/
│   └── windows/
│
├── presets/
│
├── assets/
│
├── tests/
│
├── docs/
│   ├── architecture.md
│   ├── audio-engine.md
│   ├── build-windows.md
│   ├── dsp-pipeline.md
│   ├── roadmap.md
│   └── ui-design.md
│
├── CMakeLists.txt
├── LICENSE
└── README.md
```

---

# Getting Started

## Requirements

Recommended development environment:

```text
Windows 11 x64
Visual Studio Community 2026: Desktop development with C++, MSVC v145
Windows 11 SDK (installed compatible version; no patch version pinned)
CMake 4.2+ for Visual Studio 18 2026
Node.js LTS (22.12+), npm, Git
Microsoft Edge WebView2 Runtime
Extracted WebView2 SDK 1.0.2903.40
```

C++ compiler:

```text
MSVC with C++23 support
```

---

# Build

Clone the repository:

```bash
git clone <repository-url>
cd miyazato-spatial-engine
```

Build the frontend first with `npm install` and `npm run build` in `apps/desktop/ui`.
Set `WEBVIEW2_SDK_DIR` to the extracted SDK (headers and x64 static loader).
See [Windows build instructions](docs/build-windows.md) for setup, presets, and VS2022/v143 compatibility.
[Migration validation](docs/build-toolchain-update.md): Visual Studio 2026 build not verified in this environment.

Configure the native project from PowerShell:

```powershell
cmake -S . -B build-windows-vs2026 -G "Visual Studio 18 2026" -A x64 -DWEBVIEW2_SDK_DIR="$env:WEBVIEW2_SDK_DIR"
```

Build:

```bash
cmake --build build-windows-vs2026 --config Release
```

For development builds:

```bash
cmake --build build-windows-vs2026 --config Debug
```

---

# Frontend Build

Enter the UI directory:

```bash
cd apps/desktop/ui
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Production build:

```bash
npm run build
```

---

# Running

After compiling the application, the executable should be available under a configuration-specific build directory similar to:

```text
build-windows-vs2026/Release/
```

Exact paths may vary depending on the selected CMake generator.

---

# Testing

## Native Tests

Example:

```bash
ctest --test-dir build-windows-vs2026 -C Release --output-on-failure
```

Or:

```bash
ctest --preset windows-vs2026-release
```

---

## Frontend Tests

```bash
cd apps/desktop/ui
npm run test
```

---

# Configuration

Application configuration should be stored under:

```text
%APPDATA%\MiyazatoSpatialEngine\
```

Example:

```text
MiyazatoSpatialEngine/
├── config.json
├── profiles/
├── presets/
└── logs/
```

Persisted settings may include:

- Selected output device
- Last audio mode
- Equalizer configuration
- DSP configuration
- Spatial settings
- User-created profiles
- UI preferences

---

# Preset Format

Presets use a structured format such as JSON.

Example:

```json
{
  "name": "FPS Competitive",
  "category": "gaming",
  "version": 1,
  "eq": {
    "enabled": true,
    "bands": []
  },
  "bass": {
    "enabled": true,
    "level": 25
  },
  "spatial": {
    "enabled": true,
    "intensity": 70
  },
  "dialogue": {
    "enabled": false,
    "amount": 0
  },
  "compressor": {
    "enabled": false
  },
  "outputGainDb": -3.0
}
```

Preset schemas should be versioned to maintain backward compatibility.

---

# User Interface

The application uses a premium dark-mode interface designed specifically for audio control.

Main navigation:

```text
Home
Audio Profiles
Equalizer
Spatial Audio
Advanced
Output Device
Settings
```

---

## Home

The main dashboard provides quick access to:

```text
Current audio device
Audio mode
Sample rate
Audio format
Spatial processing
Bass
Clarity
Immersion
Audio analyzer
DSP status
```

---

## Audio Mode Selector

The primary mode selector contains large interactive cards:

```text
Music
Movies
Gaming
FPS
Voice
Streaming
Custom
```

Profile transitions must use parameter smoothing rather than abrupt DSP changes.

---

## Equalizer

The equalizer screen provides an interactive frequency-response graph.

Users can manipulate parameters visually:

```text
Frequency
Gain
Q
Filter Type
```

Future versions may allow direct drag-and-drop control of filter nodes.

---

## Spatial Visualization

The spatial audio interface may represent speaker positioning similar to:

```text
              FRONT

        FL      C      FR


    SL                    SR


        RL            RR


             LISTENER
```

For headphone output, the listener can be represented visually at the center.

---

# Performance Goals

Target performance:

```text
Audio callback: real time
Internal processing: 32-bit float
Target additional latency: < 10 ms
Future latency goal: < 5 ms
UI target: 60 FPS
```

The application should expose diagnostics such as:

```text
DSP processing time
Buffer duration
Audio latency
CPU usage
Audio glitches
Underruns
Sample rate
Channel count
```

Example UI status:

```text
48 kHz
32-bit float
2 channels
4.8 ms

CPU: 2.1%
Audio Engine: Stable
Glitches: 0
```

---

# Safety and Audio Integrity

The DSP chain must protect against digital clipping.

Possible techniques include:

- Internal headroom
- Peak monitoring
- Automatic preamp compensation
- Parameter smoothing
- Final safety limiter

Examples of automatic headroom:

```text
-3 dB
-6 dB
```

depending on the active effects.

---

# Roadmap

## Phase 1 — Core MVP

- [ ] Native Windows desktop application
- [ ] WebView2 integration
- [ ] React UI
- [ ] WASAPI device enumeration
- [ ] Output-device selection
- [ ] AudioBuffer abstraction
- [ ] AudioProcessor abstraction
- [ ] DSP chain
- [ ] Gain processor
- [ ] Parametric EQ
- [ ] Bass processor
- [ ] Compressor
- [ ] Limiter
- [ ] FFT analyzer
- [ ] Spectrum UI
- [ ] Preset system
- [ ] Configuration persistence
- [ ] Music profile
- [ ] Movie profile
- [ ] Gaming profile
- [ ] FPS profile
- [ ] Voice profile
- [ ] Automated tests

---

## Phase 2 — Spatial Processing

- [ ] Stereo width
- [ ] Crossfeed
- [ ] HRTF engine
- [ ] Binaural rendering
- [ ] Virtual 5.1
- [ ] Virtual 7.1
- [ ] Upmixing
- [ ] Room simulation
- [ ] Advanced dialogue enhancement

---

## Phase 3 — Advanced Windows Integration

Research and development:

- [ ] Windows APO architecture
- [ ] System-wide audio processing
- [ ] Virtual audio endpoint
- [ ] Automatic application profiles
- [ ] Per-application settings

---

## Phase 4 — Advanced Spatial Audio

Potential future work:

- [ ] Virtual 7.1.4
- [ ] Height-channel simulation
- [ ] Personalized HRTF
- [ ] Headphone calibration
- [ ] Speaker calibration
- [ ] Convolution engine
- [ ] Room correction

---

## Phase 5 — Intelligent Processing

Potential intelligent features:

- Automatic content classification
- Adaptive equalization
- Intelligent dialogue detection
- Game-specific profiles
- Headphone model profiles
- Automatic loudness management
- Context-aware DSP configuration

These features should only be introduced after the core DSP engine is stable and measurable.

---

# Current Status

Miyazato Spatial Engine is currently under active development.

Not every feature described in this document should be considered implemented.

Features must be explicitly classified during development as:

```text
Implemented
Experimental
Prototype
Mock
Bypass
Planned
Not Implemented
```

The project must never present UI-only functionality as working DSP.

For example, if the interface displays:

```text
7.1 Virtual Surround
```

but the processing engine is not implemented yet, the feature must be clearly identified as experimental, mocked, or unavailable.

---

# Development Principles

## 1. Audio quality before visual complexity

The application exists primarily as an audio-processing product.

The DSP implementation takes priority over decorative UI features.

---

## 2. Measure performance

Performance improvements should be based on:

- Profiling
- Benchmarks
- Latency measurements
- DSP processing time

rather than assumptions.

---

## 3. Do not block the audio thread

The real-time audio path must remain deterministic and lightweight.

---

## 4. No fake features

Buttons and controls should correspond to actual functionality.

If a function does not exist yet, the UI must clearly communicate that state.

---

## 5. Test DSP components independently

DSP processors should be testable without:

- Windows UI
- WebView2
- Active sound devices

This allows unit testing of filter behavior and signal processing.

---

## 6. Preserve modularity

The application should allow future DSP components to be added without rewriting the entire engine.

---

# Legal and Trademark Notice

Miyazato Spatial Engine is an independent project.

DTS, DTS:X, DTS Headphone:X, Dolby, Dolby Atmos, Windows, Microsoft, and other third-party names and trademarks belong to their respective owners.

This project does not claim affiliation with, endorsement by, or ownership of those technologies.

The project must not:

- Copy proprietary DTS algorithms
- Copy proprietary Dolby algorithms
- Distribute proprietary codecs without permission
- Use protected branding in a way that implies official certification

Spatial processing functionality developed by this project should rely on:

- Original implementations
- Public scientific research
- Publicly documented DSP techniques
- Properly licensed datasets
- Properly licensed third-party libraries

Official support for commercial technologies should only be added through the appropriate licensing agreements.

---

# Contributing

Contributions should follow the existing architecture and engineering standards.

Before submitting changes:

```bash
cmake --build build-windows-vs2026 --config Release
ctest --test-dir build-windows-vs2026 -C Release --output-on-failure
```

For frontend changes:

```bash
npm run test
npm run build
```

Pull requests should preferably contain:

- Clear description
- Reason for change
- Relevant tests
- Performance impact when applicable
- Screenshots for UI changes
- DSP measurements for audio-processing changes

---

# Coding Standards

C++ code should prefer:

```text
RAII
std::unique_ptr
std::shared_ptr only when shared ownership is necessary
constexpr
std::span
std::array
std::vector
strong typing
noexcept where appropriate
```

Avoid:

```text
raw new
raw delete
global mutable state
large monolithic classes
hidden ownership
blocking audio callbacks
```

Formatting should be standardized through:

```text
clang-format
```

Warnings should be enabled at an appropriately strict level.

---

# Documentation

Detailed technical documentation should live under:

```text
/docs
```

Recommended documents:

```text
architecture.md
audio-engine.md
dsp-pipeline.md
realtime-guidelines.md
wasapi.md
presets.md
ui-design.md
testing.md
performance.md
roadmap.md
```

---

# Vision

The long-term vision of Miyazato Spatial Engine is to become a complete Windows audio-enhancement platform capable of providing:

```text
High-fidelity audio
Spatial headphone rendering
Gaming-oriented positional audio
Movie immersion
Music enhancement
Voice clarity
Advanced DSP
Professional visualization
Low-latency processing
```

while maintaining a clean architecture and technically honest implementation.

---

## Miyazato Spatial Engine

**Precision. Space. Clarity.**

Real-time audio processing for Windows.

## Implementação inicial — estado real

A base executável está em `apps/desktop/`, com DSP C++23 portátil em `engine/`. A especificação acima foi preservada; ela descreve objetivos, não o estado de implementação.

- [Entrega e arquivos principais](docs/first-iteration.md)
- [Compilar e executar no Windows](docs/build-windows.md)
- [Arquitetura](docs/architecture.md) · [Engine](docs/audio-engine.md) · [DSP](docs/dsp-pipeline.md) · [UI](docs/ui-design.md)
- [Funcionalidades prontas e pendentes](docs/roadmap.md) · [Licenças](docs/third-party.md)

O núcleo DSP e a UI podem ser compilados e testados no Linux. WebView2/WASAPI exigem Windows; nesta execução não foram compilados nem executados no Windows. Spectrum é Mock e HRTF/surround são Bypass. A rota WASAPI é um Prototype entre endpoints distintos, não interceptação transparente do áudio do sistema.


## Brand Assets

Official application branding is stored in `assets/branding/`. This directory is the single source of truth for application icons, logos, splash screens, brand colors and visual identity guidelines. Do not duplicate official branding assets manually in unrelated folders.

`npm run dev` and `npm run build` in `apps/desktop/ui` automatically synchronize official assets to the ignored `public/branding/` directory and generate CSS variables from `brand/brand-tokens.json`. Vite includes these copies in `dist/`; the existing WebView2 host serves them with the bundled UI. Run `npm run branding:sync` after editing source assets during a development session, or restart Vite.

The Windows executable embeds `icons/miyazato-spatial-engine.ico` through `apps/desktop/native/app.rc`. CMake creates a build-local copy for portable resource paths. `SplashScreen` is an optional reusable component; no startup delay was added.
