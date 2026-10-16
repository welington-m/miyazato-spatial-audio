#pragma once
#include <algorithm>
#include <cstdint>
#include <span>
#include <stdexcept>
#include <vector>
namespace miyazato {
struct AudioBufferView {
    std::span<float> samples;
    uint32_t channels{};
    [[nodiscard]] uint32_t frames() const noexcept {
        return channels ? static_cast<uint32_t>(samples.size() / channels) : 0;
    }
    float &at(uint32_t frame, uint32_t channel) noexcept {
        return samples[static_cast<size_t>(frame) * channels + channel];
    }
};
class AudioBuffer {
    std::vector<float> samples_;
    uint32_t channels_{};

  public:
    void prepare(uint32_t channels, uint32_t maxFrames) {
        if (!channels || !maxFrames)
            throw std::invalid_argument("Invalid buffer dimensions");
        channels_ = channels;
        samples_.assign(static_cast<size_t>(channels) * maxFrames, 0.0f);
    }
    AudioBufferView view(uint32_t frames) {
        if (static_cast<size_t>(frames) * channels_ > samples_.size())
            throw std::out_of_range("Audio block exceeds prepared capacity");
        return {std::span<float>(samples_.data(), static_cast<size_t>(frames) * channels_),
                channels_};
    }
};
} // namespace miyazato
