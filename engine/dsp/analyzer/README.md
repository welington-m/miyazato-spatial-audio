# Analyzer

Peak/RMS, limiter reduction, and decimated waveform snapshots remain in
`../Dsp.h` and `../Dsp.cpp`. `SpectrumAnalyzer.h/.cpp` add a passive SPSC sample
tap and an independent Hann/radix-2 FFT worker. The WASAPI adapter feeds the
post-limiter signal; React does not compute FFTs.

See [spectrum-analyzer.md](../../../docs/spectrum-analyzer.md) for normalization,
thread ownership, bounded buffers, IPC, performance, tests, and pending Windows
listening validation.
