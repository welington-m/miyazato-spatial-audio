# Roadmap and honest implementation status

| Area | State |
|---|---|
| Portable AudioBuffer / AudioProcessor / DSPChain | Implemented, compiled and tested on Linux |
| Gain / EQ / bass shelf / stereo / dialogue / compressor / sample-peak limiter | Implemented, portable tests |
| React UI / presets / A/B / custom persistence / EQ editing | Implemented, production build and UI tests |
| Win32 WebView2 integration | Source implemented; Windows build/run pending |
| WASAPI enumeration / event-driven separate-endpoint loopback route | Prototype source implemented; Windows hardware validation pending |
| System-wide transparent audio replacement | Not implemented; APO/virtual device required |
| Device notifications / safe stop on loss | Source implemented; Windows test pending |
| Automatic reconnect / clock drift compensation / resampling | Not implemented |
| Peak / RMS / reduction / reduced waveform snapshots | Implemented core and IPC; Windows end-to-end pending |
| FFT UI spectrum | Native worker and canvas implemented; portable tests; Windows route/listening validation pending; illustrative fallback retained |
| HRTF / virtual surround / upmix / room / height | Bypass / Phase 2 |
| True peak / lookahead / LUFS-matched bypass | Not implemented |
| Async file logging / separate control worker | Not implemented; SPSC primitive ready |
| <10 ms added latency / CPU / AVX2 gains | Targets, unmeasured |
| Installer / code signing / APO / kernel driver | Not implemented |

## Next incremental milestones

1. Run Windows CI and fix any SDK/compiler differences. Test physical endpoints and loss/restart behavior; collect actual callback/latency measurements.
2. Validate the native FFT worker on Windows; measure total analyzer CPU, callback tail latency and FIFO occupancy. Add a waveform renderer when needed.
3. Add drift-aware resampling, float/PCM conversion, IAudioClient3 engine periods, independent control worker, automatic recovery and asynchronous logging.
4. Improve bass/clarity perceptual quality, true-peak oversampling/lookahead limiter, coefficient transitions, headroom calculation and LUFS-level matching; listen/measure preset quality.
5. Phase 2: choose legally redistributable HRTF datasets and preserve attribution; implement convolution, explicit multichannel maps, upmix, frequency-dependent crossfeed and room modeling.
6. Phase 3: investigate APO COM registration, deployment/signing and supported Windows contracts. No kernel driver in this foundation.
