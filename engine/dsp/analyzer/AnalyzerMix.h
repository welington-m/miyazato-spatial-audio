#pragma once
#include <cstdint>
#include <cmath>
#include <cstring>
#include <span>
namespace miyazato::analysis {
// Decode little-endian WASAPI mix samples without alignment assumptions.
inline float decode(const unsigned char *p, unsigned bits, unsigned validBits, bool floating) {
    if (floating) {
        if (bits == 32) { float v; std::memcpy(&v, p, 4); return std::isfinite(v) ? v : 0.f; }
        double v; std::memcpy(&v, p, 8); return std::isfinite(v) ? static_cast<float>(v) : 0.f;
    }
    if (bits == 8) return (static_cast<int>(*p) - 128) / 128.f;
    uint32_t raw{};
    for (unsigned i = 0; i < bits / 8; ++i) raw |= uint32_t(p[i]) << (i * 8);
    int64_t signedValue = raw;
    if (raw & (uint32_t{1} << (bits - 1))) signedValue -= int64_t{1} << bits;
    // Extensible PCM valid bits are left aligned in their container.
    signedValue >>= bits - validBits;
    return static_cast<float>(signedValue / std::ldexp(1.0, validBits - 1));
}
inline void mixMono(const unsigned char *data, std::span<float> mono, unsigned channels,
                    unsigned bits, unsigned validBits, bool floating, bool silent) {
    for (size_t f = 0; f < mono.size(); ++f) {
        double sum = 0;
        if (!silent)
            for (unsigned c = 0; c < channels; ++c)
                sum += decode(data + (f * channels + c) * (bits / 8), bits, validBits, floating);
        mono[f] = static_cast<float>(sum / channels);
    }
}
}
