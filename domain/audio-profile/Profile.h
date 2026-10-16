#pragma once
#include <array>
#include <cmath>
#include <cstddef>
namespace miyazato {
enum class FilterType { Peak, LowShelf, HighShelf, LowPass, HighPass };
struct EqBand {
    float frequency{1000}, gainDb{}, q{0.707f};
    bool enabled{true};
    FilterType type{FilterType::Peak};
};
struct Profile {
    std::array<EqBand, 10> eq{};
    float preampDb{-6}, outputDb{}, bass{}, bassFrequency{90}, bassIntensity{50};
    float width{100}, crossfeed{}, clarity{};
    float thresholdDb{-18}, ratio{2}, attackMs{10}, releaseMs{120}, makeupDb{};
    bool compressorEnabled{false}, bypass{false};
};
inline Profile defaultProfile() {
    Profile p;
    constexpr std::array<float, 10> frequencies{31,   63,   125,  250,  500,
                                                1000, 2000, 4000, 8000, 16000};
    for (size_t i = 0; i < 10; ++i)
        p.eq[i].frequency = frequencies[i];
    return p;
}
inline bool validProfile(const Profile &p) noexcept {
    auto range = [](float v, float low, float high) {
        return std::isfinite(v) && v >= low && v <= high;
    };
    for (const auto &b : p.eq) {
        if (!range(b.frequency, 20, 20000) || !range(b.gainDb, -12, 12) || !range(b.q, 0.1f, 12) ||
            static_cast<int>(b.type) < 0 || static_cast<int>(b.type) > 4)
            return false;
    }
    return range(p.preampDb, -24, 0) && range(p.outputDb, -24, 6) && range(p.bass, 0, 100) &&
           range(p.bassFrequency, 40, 200) && range(p.bassIntensity, 0, 100) &&
           range(p.width, 0, 200) && range(p.crossfeed, 0, 100) && range(p.clarity, 0, 100) &&
           range(p.thresholdDb, -60, 0) && range(p.ratio, 1, 20) && range(p.attackMs, 0.1f, 200) &&
           range(p.releaseMs, 10, 2000) && range(p.makeupDb, 0, 12);
}

} // namespace miyazato
