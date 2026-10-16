#pragma once
#include "engine/core/AudioBuffer.h"
namespace miyazato {
class AudioProcessor {
  public:
    virtual ~AudioProcessor() = default;
    virtual void prepare(double sampleRate, uint32_t channels, uint32_t maxBlockSize) = 0;
    virtual void process(AudioBufferView buffer) noexcept = 0;
    virtual void reset() noexcept = 0;
    virtual void setBypass(bool bypass) noexcept = 0;
};
} // namespace miyazato
