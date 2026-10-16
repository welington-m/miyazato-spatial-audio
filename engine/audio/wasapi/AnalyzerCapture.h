#pragma once
#include "engine/dsp/analyzer/SpectrumAnalyzer.h"
#include "engine/audio/wasapi/AnalyzerState.h"
#include <string>
#include <thread>

namespace miyazato::windows {
enum class AnalyzerSource { InputCapture, OutputLoopback };
// Owns only capture interfaces. Never connected to the DSP or render FIFO.
class AnalyzerCapture {
    SpectrumAnalyzer spectrum_;
    std::jthread acquisition_;
    std::atomic<bool> deviceChanged_{};
    std::atomic<AnalyzerState> state_{AnalyzerState::Stopped};
    std::atomic<unsigned> sampleRate_{}, channels_{};
    std::atomic<double> acquisitionCpuMs_{};
    void run(std::stop_token, std::wstring, AnalyzerSource) noexcept;
  public:
    ~AnalyzerCapture() { stop(); }
    void start(const std::wstring &endpoint, AnalyzerSource source) noexcept;
    void stop() noexcept;
    void notifyDeviceChange() noexcept { deviceChanged_.store(true); }
    AnalyzerState state() const noexcept { return state_.load(); }
    unsigned sampleRate() const noexcept { return sampleRate_.load(); }
    unsigned channels() const noexcept { return channels_.load(); }
    double acquisitionCpuMs() const noexcept { return acquisitionCpuMs_.load(); }
    bool available() const noexcept { return state() == AnalyzerState::Running && spectrum_.available(); }
    bool snapshot(SpectrumFrame &frame) noexcept { return spectrum_.snapshot(frame); }
};
}
