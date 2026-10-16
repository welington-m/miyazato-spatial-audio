#pragma once
#include "engine/core/SpscQueue.h"
#include <array>
#include <atomic>
#include <chrono>
#include <complex>
#include <cstddef>
#include <cstdint>
#include <span>
#include <thread>
#include <vector>

namespace miyazato {
inline constexpr size_t spectrumBinCount = 64;
struct SpectrumConfig {
    size_t fftSize{2048};
    double minFrequency{20}, maxFrequency{20000};
    float floorDb{-90};
    double updatesPerSecond{60}, attackMs{40}, releaseMs{250};
};
struct SpectrumFrame {
    uint64_t generation{}, sequence{}, timestamp{}; // milliseconds on steady_clock, not wall time
    uint32_t fftSize{2048};
    double sampleRate{}, minFrequency{20}, maxFrequency{20000};
    float floorDb{-90};
    std::array<float, spectrumBinCount> bins{};
    double computeMs{}, updatesPerSecond{};
    uint64_t droppedBlocks{}, droppedFrames{};
};
// Preparation may allocate. analyze() is worker-only and never allocates or modifies its input.
class SpectrumFft {
    SpectrumConfig config_;
    double rate_{}, windowSum_{};
    std::vector<float> window_, magnitude_;
    std::vector<std::complex<float>> fft_, twiddles_;
    std::vector<size_t> reversed_;
    struct Range {
        size_t begin{}, end{};
        double interpolatedIndex{};
    };
    std::array<Range, spectrumBinCount> ranges_{};

  public:
    void prepare(double sampleRate, const SpectrumConfig &config = {});
    bool analyze(std::span<const float> samples, SpectrumFrame &frame) noexcept;
};
// One audio producer, one analyzer consumer; frame consumer is the native UI thread.
// Control lifecycle calls must be serialized and the audio producer quiescent during start/stop.
class SpectrumAnalyzer {
    static constexpr size_t blockSamples = 256, queuedBlocks = 65;
    struct SampleBlock {
        uint64_t firstSample{};
        uint32_t count{};
        std::array<float, blockSamples> mono{};
    };
    static_assert(std::atomic<size_t>::is_always_lock_free);
    static_assert(std::atomic<uint64_t>::is_always_lock_free);
    static_assert(std::atomic<bool>::is_always_lock_free);
    SpscQueue<SampleBlock, queuedBlocks> samples_;
    SpscQueue<SpectrumFrame, 4> frames_;
    std::atomic<bool> available_{};
    std::atomic<uint64_t> droppedBlocks_{}, generation_{};
    uint64_t nextSample_{}; // audio producer only
    SpectrumConfig config_;
    double rate_{};
    SpectrumFft fft_;
    std::vector<float> history_, ordered_;
    std::jthread worker_;
    void run(std::stop_token) noexcept;

  public:
    ~SpectrumAnalyzer() { stop(); }
    // Failure is contained here and never fails audio setup/playback.
    bool start(double sampleRate, const SpectrumConfig &config = {}) noexcept;
    void stop() noexcept;
    bool available() const noexcept { return available_.load(std::memory_order_acquire); }
    uint64_t droppedBlocks() const noexcept {
        return droppedBlocks_.load(std::memory_order_relaxed);
    }
    void tap(std::span<const float> interleaved, uint32_t channels) noexcept;
    bool snapshot(SpectrumFrame &frame) noexcept {
        while (frames_.pop(frame))
            if (frame.generation == generation_.load(std::memory_order_acquire))
                return true;
        return false;
    }
};
} // namespace miyazato
