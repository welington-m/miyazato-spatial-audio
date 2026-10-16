# DSP pipeline

Interleaved float32 input → smoothed preamp → 10 Hz DC blocker → 10-band parametric EQ → low-shelf bass → stereo width/basic crossfeed → **upmix/HRTF bypass** → dialogue bell → linked compressor → smoothed output gain → dry/wet bypass crossfade → sample-peak safety limiter → output.

The final limiter deliberately follows output gain so the gain control cannot defeat its ceiling. This differs from the initial product sketch for clipping safety.

## Real processors

- Gain: dB conversion and a 100 ms linear amplitude ramp.
- DC blocker: per-channel first-order high-pass difference equation.
- EQ: original implementation of standard biquad low/high shelf, peak, low/high pass transfer functions, transposed direct form II state per channel. Frequency limited below Nyquist; ±12 dB gain, Q 0.1–12. Normalized coefficients interpolate for 100 ms. Coefficient interpolation mitigates steps but is not a perceptual crossfade; extreme rapid edits still require listening/automation stability validation.
- Bass: low shelf at 40–200 Hz, boost limited to 6 dB by bass × intensity. Default input headroom −6 dB; limiter remains a safety net when cumulative boosts exceed headroom. It is not harmonic synthesis.
- Stereo: mid/side width 0–200%; channel blending crossfeed 0–100%. Width preserves the mono sum; no frequency-dependent/headphone crossfeed is claimed.
- Dialogue: broad bell around 2.4 kHz, up to +4.5 dB; improves presence without changing all frequencies. It does not separate voice from other sources.
- Compressor: linked peak envelope, threshold, ratio, attack, release, makeup. Ratio/threshold/makeup are smoothed. Attack/release update on profile application; smoothing these time constants is pending. No lookahead.
- Limiter: stereo/multichannel linked instantaneous peak attenuation, 80 ms recovery, ceiling 0.98. It sanitizes non-finite output. **Sample peak only**, not true peak; no oversampling/lookahead. Abrupt overloaded transients may distort; release recovery is smoothed.

## Bypass and comparisons

A/B stores two full UI parameter states and submits transitions. Global power and bypass use the same 100 ms crossfade to dry audio attenuated by a fixed −6 dB, retaining final safety limiting. This is a consistent headroom reference, not automatic loudness compensation, perceptually level-matched A/B or bit-perfect passthrough. Active filters continue processing while bypassed to retain continuity.

## Analyzer

Real: output peak/RMS per L/R, sample-peak limiter gain reduction, 128-point decimated block waveform snapshots up to 30 Hz. Values describe the latest block at publication, not a continuously accumulated 30 Hz window. UI uses these peak/RMS meters and orb amplitude. A passive post-limiter raw-sample SPSC feed now drives an independent 2048-point Hann FFT worker and 64 logarithmic canvas bars. The decimated waveform is not FFT input. Browser/awaiting-data fallback remains labeled illustrative; LIVE requires a valid native spectrum frame. See [spectrum-analyzer.md](spectrum-analyzer.md) for normalization and pending Windows integration/listening validation.

Core accepts sample rates 8–192 kHz and 1–16 channels for future adapters. Tests cover 44.1, 48 and 96 kHz EQ; multichannel transport, channel maps, 192 kHz quality and SIMD benchmarks are pending. No measurable SIMD optimization is claimed.
