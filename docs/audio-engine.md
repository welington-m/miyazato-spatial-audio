# Audio engine

## Implemented source code / Windows validation pending

Device enumeration uses `IMMDeviceEnumerator`, friendly-name property stores and `IAudioClient::GetMixFormat`. It reports active render endpoints, console default endpoint, channel count, sample rate, bit depth and float format. The native route uses shared-mode, event-driven `IAudioCaptureClient` loopback on a source render endpoint and `IAudioRenderClient` on another endpoint. MMCSS `Pro Audio` is requested on the worker.

The current route accepts **distinct endpoints with matching sample rate, stereo channels and float32 mix formats**. It rejects unsupported combinations explicitly. A bounded preallocated FIFO absorbs short scheduling skew. Capture discontinuities increment glitches; FIFO overflow increments overruns; output shortfall inserts silence and increments underruns. Output is primed silent. Callback elapsed time and output latency estimates are published through atomics.

`bufferMs` is the output stream latency plus output buffer duration estimate, not measured end-to-end latency or additional DSP latency. FIFO depth, capture buffers and clocks contribute additional latency. The <10 ms target is unverified. CPU percentage is deliberately absent; callback duration is a measured worker iteration, including buffer movement and DSP, and is not CPU utilization.

## How to exercise the prototype

1. Connect two independent render devices (e.g. HDMI/monitor speakers and USB headphones).
2. Route your player to the source device through Windows app sound settings.
3. Choose the same source device in Output Device, select the distinct headphone device as output.
4. Ensure Windows configures both stereo float32 mix formats at the same sample rate.
5. Start prototype route. Apply profiles and inspect peak/RMS, limiter reduction and counters.

The source endpoint still produces its original audio. Mute it externally where appropriate: software mute may suppress loopback depending on the path. DRM-protected content may not be capturable. Independent endpoint clocks drift; adaptive resampling/clock synchronization is pending, so long sessions may underrun or overrun.

## Recovery and lifecycle

COM and handles are RAII-managed; clients stop on worker exit. Device failures terminate the route safely and post an error. Device changes notify the control thread; endpoint removal/disable conservatively stops active routing. Automatic reconnect and selecting a new default during playback are pending. Refresh and restart using available endpoints.

## Why loopback is not transparent system-wide processing

WASAPI loopback observes already-rendered sound. It cannot replace the original stream or silently intercept every application. Feeding that capture back to the same endpoint creates feedback. The app therefore refuses this configuration. True transparent system-wide processing needs an APO or a virtual device routing architecture; neither is implemented in Phase 1. No kernel code is included.

## Windows validation still required

Build host on Windows x64, test startup with/without WebView2 runtime, multiple endpoints, 44.1/48/96 kHz, silence, start/stop/restart, endpoint removal, default changes, Bluetooth reconnect, long-running drift and actual callback allocation traces. Linux DSP tests cannot validate WASAPI behavior.
