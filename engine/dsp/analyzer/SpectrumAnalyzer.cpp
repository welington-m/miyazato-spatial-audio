#include "engine/dsp/analyzer/SpectrumAnalyzer.h"
#include <algorithm>
#include <cmath>
#include <numbers>
#include <stdexcept>

namespace miyazato {
void SpectrumFft::prepare(double sampleRate, const SpectrumConfig &config) {
    if (!std::isfinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000 ||
        (config.fftSize != 1024 && config.fftSize != 2048 && config.fftSize != 4096 &&
         config.fftSize != 8192) ||
        !std::isfinite(config.minFrequency) || !std::isfinite(config.maxFrequency) ||
        config.minFrequency < 1 ||
        config.minFrequency >= std::min(config.maxFrequency, sampleRate / 2) ||
        !std::isfinite(config.floorDb) || config.floorDb >= 0 || config.floorDb < -200 ||
        !std::isfinite(config.updatesPerSecond) || config.updatesPerSecond < 1 ||
        config.updatesPerSecond > 100 || !std::isfinite(config.attackMs) || config.attackMs <= 0 ||
        !std::isfinite(config.releaseMs) || config.releaseMs <= 0)
        throw std::invalid_argument("Invalid spectrum analyzer configuration");
    config_ = config;
    config_.maxFrequency = std::min(config.maxFrequency, sampleRate / 2);
    rate_ = sampleRate;
    const auto n = config.fftSize;
    window_.resize(n);
    magnitude_.resize(n / 2 + 1);
    fft_.resize(n);
    twiddles_.resize(n / 2);
    reversed_.resize(n);
    windowSum_ = 0;
    // Periodic Hann: coherent gain correction uses the actual coefficient sum.
    for (size_t i = 0; i < n; ++i) {
        window_[i] = static_cast<float>(0.5 - 0.5 * std::cos(2 * std::numbers::pi * i / n));
        windowSum_ += window_[i];
        size_t input = i, reverse = 0;
        for (size_t bit = n; bit > 1; bit >>= 1) {
            reverse = (reverse << 1) | (input & 1);
            input >>= 1;
        }
        reversed_[i] = reverse;
    }
    for (size_t i = 0; i < n / 2; ++i) {
        const auto angle = -2 * std::numbers::pi * i / n;
        twiddles_[i] = {static_cast<float>(std::cos(angle)), static_cast<float>(std::sin(angle))};
    }
    const double resolution = rate_ / n;
    for (size_t i = 0; i < spectrumBinCount; ++i) {
        const double low =
            config_.minFrequency * std::pow(config_.maxFrequency / config_.minFrequency,
                                            static_cast<double>(i) / spectrumBinCount);
        const double high =
            config_.minFrequency * std::pow(config_.maxFrequency / config_.minFrequency,
                                            static_cast<double>(i + 1) / spectrumBinCount);
        ranges_[i] = {
            std::max(size_t{1}, static_cast<size_t>(std::ceil(low / resolution))),
            std::min(n / 2 + 1, static_cast<size_t>(i + 1 == spectrumBinCount
                                                        ? std::floor(high / resolution) + 1
                                                        : std::ceil(high / resolution))),
            std::clamp(std::sqrt(low * high) / resolution, 0.0, static_cast<double>(n / 2))};
    }
}
bool SpectrumFft::analyze(std::span<const float> samples, SpectrumFrame &frame) noexcept {
    const auto n = config_.fftSize;
    if (samples.size() != n || fft_.size() != n)
        return false;
    double mean = 0;
    // A Hann-weighted mean removes windowed DC without injecting the unweighted
    // block mean as a low-frequency artifact into an off-bin high-frequency tone.
    for (size_t i = 0; i < n; ++i)
        mean += (std::isfinite(samples[i]) ? samples[i] : 0) * static_cast<double>(window_[i]);
    mean /= windowSum_;
    for (size_t i = 0; i < n; ++i) {
        const double sample = std::isfinite(samples[i]) ? samples[i] : 0;
        fft_[reversed_[i]] = {static_cast<float>((sample - mean) * window_[i]), 0};
    }
    // Iterative radix-2 Cooley-Tukey, O(N log N); precomputed bit reversal and twiddles.
    for (size_t size = 2; size <= n; size <<= 1) {
        const size_t half = size / 2, stride = n / size;
        for (size_t base = 0; base < n; base += size)
            for (size_t j = 0; j < half; ++j) {
                const auto even = fft_[base + j];
                const auto odd = fft_[base + j + half] * twiddles_[j * stride];
                fft_[base + j] = even + odd;
                fft_[base + j + half] = even - odd;
            }
    }
    for (size_t i = 0; i <= n / 2; ++i)
        magnitude_[i] =
            static_cast<float>(std::abs(fft_[i]) * ((i == 0 || i == n / 2) ? 1 : 2) / windowSum_);
    frame.fftSize = static_cast<uint32_t>(n);
    frame.sampleRate = rate_;
    frame.minFrequency = config_.minFrequency;
    frame.maxFrequency = config_.maxFrequency;
    frame.floorDb = config_.floorDb;
    for (size_t i = 0; i < spectrumBinCount; ++i) {
        const auto &range = ranges_[i];
        float magnitude = 0;
        for (size_t bin = range.begin; bin < range.end; ++bin)
            magnitude = std::max(magnitude, magnitude_[bin]);
        if (range.begin >= range.end) {
            // Narrow low-frequency bands can be smaller than one FFT bin. Interpolate
            // measured linear magnitudes; this does not create extra FFT resolution.
            const auto lower = static_cast<size_t>(range.interpolatedIndex);
            const auto upper = std::min(lower + 1, n / 2);
            magnitude = std::lerp(magnitude_[lower], magnitude_[upper],
                                  static_cast<float>(range.interpolatedIndex - lower));
        }
        const float db = 20 * std::log10(std::max(magnitude, 1e-12f));
        frame.bins[i] = std::isfinite(db) ? std::clamp(db, config_.floorDb, 0.0f) : config_.floorDb;
    }
    return true;
}
bool SpectrumAnalyzer::start(double sampleRate, const SpectrumConfig &config) noexcept {
    stop();
    try {
        SampleBlock ignored;
        while (samples_.pop(ignored)) {
        }
        fft_.prepare(sampleRate, config);
        config_ = config;
        rate_ = sampleRate;
        history_.assign(config.fftSize, 0);
        ordered_.assign(config.fftSize, 0);
        nextSample_ = 0;
        generation_.fetch_add(1, std::memory_order_release);
        droppedBlocks_.store(0, std::memory_order_relaxed);
        available_.store(true, std::memory_order_release);
        worker_ = std::jthread([this](std::stop_token token) { run(token); });
        return true;
    } catch (...) {
        available_.store(false, std::memory_order_release);
        return false;
    }
}
void SpectrumAnalyzer::stop() noexcept {
    available_.store(false, std::memory_order_release);
    if (worker_.joinable()) {
        worker_.request_stop();
        worker_.join();
    }
}
void SpectrumAnalyzer::tap(std::span<const float> interleaved, uint32_t channels) noexcept {
    if (!available() || (channels != 1 && channels != 2) || interleaved.size() % channels)
        return;
    const size_t count = interleaved.size() / channels;
    for (size_t offset = 0; offset < count; offset += blockSamples) {
        SampleBlock block;
        block.firstSample = nextSample_ + offset;
        block.count = static_cast<uint32_t>(std::min(blockSamples, count - offset));
        for (uint32_t i = 0; i < block.count; ++i) {
            const auto index = (offset + i) * channels;
            block.mono[i] = channels == 2
                                ? interleaved[index] * 0.5f + interleaved[index + 1] * 0.5f
                                : interleaved[index];
        }
        if (!samples_.push(block))
            droppedBlocks_.fetch_add(1, std::memory_order_relaxed);
    }
    nextSample_ += count;
}
void SpectrumAnalyzer::run(std::stop_token token) noexcept {
    try {
        using Clock = std::chrono::steady_clock;
        const auto interval = std::chrono::duration_cast<Clock::duration>(
            std::chrono::duration<double>(1 / config_.updatesPerSecond));
        auto next = Clock::now(), lastAnalysis = next;
        const auto generation = generation_.load(std::memory_order_acquire);
        size_t cursor = 0, filled = 0;
        uint64_t expectedSample = 0, sequence = 0, droppedFrames = 0;
        std::array<float, spectrumBinCount> smoothed;
        smoothed.fill(config_.floorDb);
        while (!token.stop_requested()) {
            SampleBlock block;
            bool received = false;
            // Bound each drain even if a producer is continually writing.
            for (size_t drained = 0; drained < queuedBlocks - 1 && samples_.pop(block); ++drained) {
                if (block.firstSample != expectedSample) {
                    filled = cursor = 0; // Never join samples across a dropped-data gap.
                }
                expectedSample = block.firstSample + block.count;
                for (uint32_t i = 0; i < block.count; ++i) {
                    history_[cursor] = block.mono[i];
                    cursor = (cursor + 1) % history_.size();
                    filled = std::min(filled + 1, history_.size());
                }
                received = true;
            }
            if (received && filled == history_.size()) {
                for (size_t i = 0; i < history_.size(); ++i)
                    ordered_[i] = history_[(cursor + i) % history_.size()];
                SpectrumFrame frame;
                const auto begin = Clock::now();
                if (!fft_.analyze(ordered_, frame))
                    throw std::runtime_error("Spectrum transform failed");
                const auto now = Clock::now();
                const double elapsed = std::chrono::duration<double>(now - lastAnalysis).count();
                const double attack = std::exp(-elapsed / (config_.attackMs * 0.001));
                const double release = std::exp(-elapsed / (config_.releaseMs * 0.001));
                for (size_t i = 0; i < spectrumBinCount; ++i) {
                    const auto coefficient = frame.bins[i] > smoothed[i] ? attack : release;
                    smoothed[i] = static_cast<float>(coefficient * smoothed[i] +
                                                     (1 - coefficient) * frame.bins[i]);
                    frame.bins[i] = smoothed[i];
                }
                frame.computeMs = std::chrono::duration<double, std::milli>(now - begin).count();
                frame.updatesPerSecond = elapsed > 0 ? 1 / elapsed : 0;
                frame.timestamp = static_cast<uint64_t>(
                    std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch())
                        .count());
                frame.generation = generation;
                frame.sequence = ++sequence;
                frame.droppedBlocks = droppedBlocks();
                frame.droppedFrames = droppedFrames;
                if (!frames_.push(frame))
                    ++droppedFrames;
                lastAnalysis = now;
            }
            next += interval;
            // Skip missed worker deadlines instead of doing bursts of catch-up FFTs.
            if (next < Clock::now())
                next = Clock::now() + interval;
            std::this_thread::sleep_until(next);
        }
    } catch (...) {
        available_.store(false, std::memory_order_release);
    }
}
} // namespace miyazato
