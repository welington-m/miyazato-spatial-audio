#pragma once
#include "engine/dsp/Dsp.h"
#include <atomic>
#include <mutex>
#include <string>
#include <thread>
namespace miyazato::windows {
struct EngineStatus {
    bool running{};
    uint64_t underruns{}, overruns{}, glitches{};
    double bufferMs{}, callbackMs{};
    std::string error;
};
// Prototype routing: source and sink must be different physical endpoints.
// Only equal-rate stereo float shared-mode endpoints are supported in this iteration.
class LoopbackEngine {
    DSPChain chain_;
    Profile desired_{defaultProfile()};
    std::atomic<bool> accepting_{};
    std::jthread worker_;
    std::atomic<bool> running_{};
    std::atomic<uint64_t> underruns_{}, overruns_{}, glitches_{};
    std::atomic<double> latency_{}, callbackMs_{};
    mutable std::mutex errorMutex_;
    std::string error_;
    void run(std::stop_token, std::wstring, std::wstring) noexcept;

  public:
    ~LoopbackEngine() { stop(); }
    void start(const std::wstring &source, const std::wstring &sink);
    void stop();
    bool configure(const Profile &p) noexcept {
        if (!validProfile(p))
            return false;
        desired_ = p;
        return !accepting_.load() || chain_.submit(p);
    }
    bool snapshot(AnalyzerSnapshot &s) noexcept { return chain_.snapshot(s); }
    EngineStatus status() const;
};
} // namespace miyazato::windows
