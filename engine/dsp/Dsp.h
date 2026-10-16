#pragma once
#include "domain/audio-profile/Profile.h"
#include "engine/core/AudioProcessor.h"
#include "engine/core/SpscQueue.h"
#include <array>
#include <vector>
namespace miyazato {
class SmoothedValue {
    float current_{}, target_{}, step_{};
    uint32_t remaining_{};

  public:
    void reset(float v) noexcept {
        current_ = target_ = v;
        remaining_ = 0;
    }
    void target(float v, uint32_t samples) noexcept;
    float next() noexcept;
};
class Gain final : public AudioProcessor {
    SmoothedValue gain_, bypassMix_;
    double rate_{48000};

  public:
    void prepare(double, uint32_t, uint32_t) override;
    void setGainDb(float db) noexcept;
    void process(AudioBufferView) noexcept override;
    void reset() noexcept override;
    void setBypass(bool) noexcept override;
};
struct BiquadCoefficients {
    double b0{1}, b1{}, b2{}, a1{}, a2{};
};
BiquadCoefficients designFilter(const EqBand &, double sampleRate) noexcept;
class ParametricEQ final : public AudioProcessor {
    struct State {
        double z1{}, z2{};
    };
    struct Band {
        BiquadCoefficients current{}, target{};
        uint32_t remaining{};
    };
    std::array<Band, 10> bands_{};
    std::vector<std::array<State, 10>> state_;
    double rate_{48000};
    SmoothedValue wet_;

  public:
    void prepare(double, uint32_t, uint32_t) override;
    void setBands(const std::array<EqBand, 10> &) noexcept;
    void process(AudioBufferView) noexcept override;
    void reset() noexcept override;
    void setBypass(bool) noexcept override;
};
class Limiter final : public AudioProcessor {
    float envelope_{1}, release_{}, reductionDb_{};
    bool bypass_{};

  public:
    void prepare(double, uint32_t, uint32_t) override;
    void process(AudioBufferView) noexcept override;
    void reset() noexcept override {
        envelope_ = 1;
        reductionDb_ = 0;
    }
    void setBypass(bool b) noexcept override { bypass_ = b; }
    float reductionDb() const noexcept { return reductionDb_; }
};
struct AnalyzerSnapshot {
    float peakL{}, peakR{}, rmsL{}, rmsR{}, reductionDb{};
    std::array<float, 128> waveform{};
};
// Configure and prepare only on control thread before processing starts.
// Submit profile on control thread; process and snapshots producer on audio thread.
class DSPChain final : public AudioProcessor {
    Gain preamp_, output_;
    ParametricEQ eq_, bass_, dialogue_;
    Limiter limiter_;
    SpscQueue<Profile, 16> commands_;
    SpscQueue<AnalyzerSnapshot, 8> snapshots_;
    Profile profile_{defaultProfile()};
    double rate_{48000};
    uint32_t channels_{}, maxFrames_{};
    std::vector<float> dry_, dcInput_, dcOutput_;
    SmoothedValue wet_, width_, crossfeed_, threshold_, ratio_, makeup_;
    float envelope_{}, attack_{}, release_{}, dcPole_{};
    uint64_t snapshotFrames_{};
    void apply(const Profile &) noexcept;

  public:
    void prepare(double, uint32_t, uint32_t) override;
    bool submit(const Profile &profile) noexcept {
        return validProfile(profile) && commands_.push(profile);
    }
    void discardPending() noexcept {
        Profile ignored;
        while (commands_.pop(ignored)) {
        }
    }
    bool snapshot(AnalyzerSnapshot &value) noexcept { return snapshots_.pop(value); }
    void process(AudioBufferView) noexcept override;
    void reset() noexcept override;
    void setBypass(bool) noexcept override;
};
} // namespace miyazato
