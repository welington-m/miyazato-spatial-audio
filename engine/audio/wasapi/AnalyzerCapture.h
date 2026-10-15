#pragma once
#include "engine/dsp/analyzer/SpectrumAnalyzer.h"
#include <string>
#include <thread>

namespace miyazato::windows {
enum class AnalyzerSource { InputCapture, OutputLoopback };
// Owns only capture interfaces. Never connected to the DSP or render FIFO.
class AnalyzerCapture {
    SpectrumAnalyzer spectrum_;
    std::jthread acquisition_;
    void run(std::stop_token, std::wstring, AnalyzerSource) noexcept;
  public:
    ~AnalyzerCapture() { stop(); }
    void start(const std::wstring &endpoint, AnalyzerSource source) noexcept;
    void stop() noexcept;
    bool available() const noexcept { return spectrum_.available(); }
    bool snapshot(SpectrumFrame &frame) noexcept { return spectrum_.snapshot(frame); }
};
}
