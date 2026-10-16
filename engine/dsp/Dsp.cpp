#include "engine/dsp/Dsp.h"
#include <algorithm>
#include <cmath>
#include <numbers>
#include <stdexcept>
namespace miyazato {
namespace {
float amplitude(float db) noexcept {
    return std::pow(10.0f, std::clamp(db, -60.0f, 24.0f) / 20.0f);
}
uint32_t ramp(double rate) noexcept { return static_cast<uint32_t>(rate * 0.1); }
void validate(double rate, uint32_t channels, uint32_t frames) {
    if (!std::isfinite(rate) || rate < 8000 || rate > 192000 || !channels || channels > 16 ||
        !frames)
        throw std::invalid_argument("Unsupported audio format");
}
} // namespace
void SmoothedValue::target(float v, uint32_t samples) noexcept {
    if (v == target_)
        return;
    target_ = v;
    remaining_ = samples;
    step_ = samples ? (v - current_) / static_cast<float>(samples) : 0;
    if (!samples)
        current_ = v;
}
float SmoothedValue::next() noexcept {
    if (remaining_ && --remaining_ == 0)
        current_ = target_;
    else if (remaining_)
        current_ += step_;
    return current_;
}
void Gain::prepare(double r, uint32_t c, uint32_t n) {
    validate(r, c, n);
    rate_ = r;
    gain_.reset(1);
    bypassMix_.reset(1);
}
void Gain::setGainDb(float db) noexcept { gain_.target(amplitude(db), ramp(rate_)); }
void Gain::reset() noexcept { gain_.reset(1); }
void Gain::setBypass(bool b) noexcept { bypassMix_.target(b ? 0.0f : 1.0f, ramp(rate_)); }
void Gain::process(AudioBufferView b) noexcept {
    for (uint32_t f = 0; f < b.frames(); ++f) {
        float g = 1 + (gain_.next() - 1) * bypassMix_.next();
        for (uint32_t c = 0; c < b.channels; ++c)
            b.at(f, c) *= g;
    }
}
BiquadCoefficients designFilter(const EqBand &band, double rate) noexcept {
    if (!band.enabled)
        return {};
    const double w =
        2 * std::numbers::pi * std::clamp<double>(band.frequency, 20, rate * 0.45) / rate;
    const double cs = std::cos(w), sn = std::sin(w),
                 a = std::pow(10.0, std::clamp<double>(band.gainDb, -12, 12) / 40);
    const double alpha = sn / (2 * std::clamp<double>(band.q, 0.1, 12));
    double b0 = 1, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;
    switch (band.type) {
    case FilterType::Peak:
        b0 = 1 + alpha * a;
        b1 = -2 * cs;
        b2 = 1 - alpha * a;
        a0 = 1 + alpha / a;
        a1 = -2 * cs;
        a2 = 1 - alpha / a;
        break;
    case FilterType::LowPass:
        b0 = (1 - cs) / 2;
        b1 = 1 - cs;
        b2 = b0;
        a0 = 1 + alpha;
        a1 = -2 * cs;
        a2 = 1 - alpha;
        break;
    case FilterType::HighPass:
        b0 = (1 + cs) / 2;
        b1 = -(1 + cs);
        b2 = b0;
        a0 = 1 + alpha;
        a1 = -2 * cs;
        a2 = 1 - alpha;
        break;
    case FilterType::LowShelf: {
        const double t = 2 * std::sqrt(a) * alpha;
        b0 = a * ((a + 1) - (a - 1) * cs + t);
        b1 = 2 * a * ((a - 1) - (a + 1) * cs);
        b2 = a * ((a + 1) - (a - 1) * cs - t);
        a0 = (a + 1) + (a - 1) * cs + t;
        a1 = -2 * ((a - 1) + (a + 1) * cs);
        a2 = (a + 1) + (a - 1) * cs - t;
        break;
    }
    case FilterType::HighShelf: {
        const double t = 2 * std::sqrt(a) * alpha;
        b0 = a * ((a + 1) + (a - 1) * cs + t);
        b1 = -2 * a * ((a - 1) + (a + 1) * cs);
        b2 = a * ((a + 1) + (a - 1) * cs - t);
        a0 = (a + 1) - (a - 1) * cs + t;
        a1 = 2 * ((a - 1) - (a + 1) * cs);
        a2 = (a + 1) - (a - 1) * cs - t;
        break;
    }
    }
    return {b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0};
}
void ParametricEQ::prepare(double r, uint32_t c, uint32_t n) {
    validate(r, c, n);
    rate_ = r;
    state_.assign(c, {});
    bands_ = {};
    wet_.reset(1);
}
void ParametricEQ::setBands(const std::array<EqBand, 10> &values) noexcept {
    for (size_t i = 0; i < 10; ++i) {
        bands_[i].target = designFilter(values[i], rate_);
        bands_[i].remaining = ramp(rate_);
    }
}
void ParametricEQ::setBypass(bool b) noexcept { wet_.target(b ? 0.0f : 1.0f, ramp(rate_)); }
void ParametricEQ::reset() noexcept {
    for (auto &channel : state_)
        channel = {};
}
void ParametricEQ::process(AudioBufferView buffer) noexcept {
    if (buffer.channels != state_.size())
        return;
    for (uint32_t f = 0; f < buffer.frames(); ++f) {
        for (auto &band : bands_)
            if (band.remaining) {
                auto move = [&](double &x, double y) { x += (y - x) / band.remaining; };
                move(band.current.b0, band.target.b0);
                move(band.current.b1, band.target.b1);
                move(band.current.b2, band.target.b2);
                move(band.current.a1, band.target.a1);
                move(band.current.a2, band.target.a2);
                --band.remaining;
            }
        float mix = wet_.next();
        for (uint32_t c = 0; c < buffer.channels; ++c) {
            double x = buffer.at(f, c);
            const double dry = x;
            for (size_t i = 0; i < 10; ++i) {
                auto &s = state_[c][i];
                const auto &k = bands_[i].current;
                double y = k.b0 * x + s.z1;
                s.z1 = k.b1 * x - k.a1 * y + s.z2;
                s.z2 = k.b2 * x - k.a2 * y;
                if (std::abs(s.z1) < 1e-25)
                    s.z1 = 0;
                if (std::abs(s.z2) < 1e-25)
                    s.z2 = 0;
                x = y;
            }
            buffer.at(f, c) = static_cast<float>(dry + (x - dry) * mix);
        }
    }
}
void Limiter::prepare(double r, uint32_t c, uint32_t n) {
    validate(r, c, n);
    release_ = static_cast<float>(std::exp(-1 / (r * 0.08)));
    reset();
}
void Limiter::process(AudioBufferView b) noexcept {
    reductionDb_ = 0;
    for (uint32_t f = 0; f < b.frames(); ++f) {
        float peak = 0;
        for (uint32_t c = 0; c < b.channels; ++c) {
            auto &x = b.at(f, c);
            if (!std::isfinite(x))
                x = 0;
            peak = std::max(peak, std::abs(x));
        }
        float target = peak > 0.98f ? 0.98f / peak : 1.0f;
        envelope_ = target < envelope_ ? target : release_ * envelope_ + (1 - release_) * target;
        if (!bypass_) {
            for (uint32_t c = 0; c < b.channels; ++c)
                b.at(f, c) *= envelope_;
            reductionDb_ = std::max(reductionDb_, -20 * std::log10(std::max(envelope_, 1e-9f)));
        }
    }
}
void DSPChain::prepare(double r, uint32_t c, uint32_t n) {
    validate(r, c, n);
    rate_ = r;
    channels_ = c;
    maxFrames_ = n;
    dry_.assign(static_cast<size_t>(c) * n, 0);
    dcInput_.assign(c, 0);
    dcOutput_.assign(c, 0);
    preamp_.prepare(r, c, n);
    output_.prepare(r, c, n);
    eq_.prepare(r, c, n);
    bass_.prepare(r, c, n);
    dialogue_.prepare(r, c, n);
    limiter_.prepare(r, c, n);
    wet_.reset(1);
    width_.reset(1);
    crossfeed_.reset(0);
    threshold_.reset(-18);
    ratio_.reset(1);
    makeup_.reset(1);
    dcPole_ = static_cast<float>(std::exp(-2 * std::numbers::pi * 10 / r));
    apply(profile_);
    reset();
}
void DSPChain::apply(const Profile &p) noexcept {
    profile_ = p;
    preamp_.setGainDb(p.preampDb);
    output_.setGainDb(p.outputDb);
    eq_.setBands(p.eq);
    auto bands = defaultProfile().eq;
    for (auto &b : bands)
        b.enabled = false;
    bands[0] = {std::clamp(p.bassFrequency, 40.0f, 200.0f),
                std::clamp(p.bass, 0.0f, 100.0f) * std::clamp(p.bassIntensity, 0.0f, 100.0f) *
                    0.0006f,
                0.707f, true, FilterType::LowShelf};
    bass_.setBands(bands);
    bands[0] = {2400, std::clamp(p.clarity, 0.0f, 100.0f) * 0.045f, 0.65f, true, FilterType::Peak};
    dialogue_.setBands(bands);
    width_.target(std::clamp(p.width, 0.0f, 200.0f) / 100, ramp(rate_));
    crossfeed_.target(std::clamp(p.crossfeed, 0.0f, 100.0f) / 200, ramp(rate_));
    threshold_.target(std::clamp(p.thresholdDb, -60.0f, 0.0f), ramp(rate_));
    ratio_.target(p.compressorEnabled ? std::clamp(p.ratio, 1.0f, 20.0f) : 1.0f, ramp(rate_));
    makeup_.target(p.compressorEnabled ? amplitude(p.makeupDb) : 1.0f, ramp(rate_));
    attack_ =
        static_cast<float>(std::exp(-1 / (rate_ * std::clamp(p.attackMs, 0.1f, 200.0f) * 0.001)));
    release_ = static_cast<float>(
        std::exp(-1 / (rate_ * std::clamp(p.releaseMs, 10.0f, 2000.0f) * 0.001)));
    wet_.target(p.bypass ? 0.0f : 1.0f, ramp(rate_));
}
void DSPChain::setBypass(bool b) noexcept {
    profile_.bypass = b;
    wet_.target(b ? 0.0f : 1.0f, ramp(rate_));
}
void DSPChain::reset() noexcept {
    eq_.reset();
    bass_.reset();
    dialogue_.reset();
    limiter_.reset();
    std::fill(dcInput_.begin(), dcInput_.end(), 0);
    std::fill(dcOutput_.begin(), dcOutput_.end(), 0);
    envelope_ = 0;
    snapshotFrames_ = 0;
}
void DSPChain::process(AudioBufferView b) noexcept {
    if (b.channels != channels_ || b.frames() > maxFrames_)
        return;
    Profile command;
    while (commands_.pop(command))
        apply(command);
    for (size_t i = 0; i < b.samples.size(); ++i) {
        if (!std::isfinite(b.samples[i]))
            b.samples[i] = 0;
        dry_[i] = b.samples[i];
    }
    preamp_.process(b);
    for (uint32_t f = 0; f < b.frames(); ++f)
        for (uint32_t c = 0; c < b.channels; ++c) {
            float x = b.at(f, c), y = x - dcInput_[c] + dcPole_ * dcOutput_[c];
            dcInput_[c] = x;
            dcOutput_[c] = y;
            b.at(f, c) = y;
        }
    eq_.process(b);
    bass_.process(b);
    for (uint32_t f = 0; f < b.frames(); ++f) {
        float w = width_.next(), x = crossfeed_.next();
        if (b.channels == 2) {
            float l = b.at(f, 0), r = b.at(f, 1), mid = (l + r) * 0.5f, side = (l - r) * 0.5f * w;
            b.at(f, 0) = (mid + side) * (1 - x) + (mid - side) * x;
            b.at(f, 1) = (mid - side) * (1 - x) + (mid + side) * x;
        }
    }
    dialogue_.process(b);
    for (uint32_t f = 0; f < b.frames(); ++f) {
        float peak = 0;
        for (uint32_t c = 0; c < b.channels; ++c)
            peak = std::max(peak, std::abs(b.at(f, c)));
        float coeff = peak > envelope_ ? attack_ : release_;
        envelope_ = coeff * envelope_ + (1 - coeff) * peak;
        float level = 20 * std::log10(std::max(envelope_, 1e-9f)), t = threshold_.next(),
              r = ratio_.next();
        float g = amplitude(std::min(0.0f, (t - level) * (1 - 1 / r))) * makeup_.next();
        for (uint32_t c = 0; c < b.channels; ++c)
            b.at(f, c) *= g;
    }
    output_.process(b);
    // Constant -6 dB reference in dry comparison. Final safety limiter follows output gain.
    for (uint32_t f = 0; f < b.frames(); ++f) {
        float wet = wet_.next();
        for (uint32_t c = 0; c < b.channels; ++c) {
            size_t i = static_cast<size_t>(f) * b.channels + c;
            b.samples[i] = dry_[i] * 0.501187f * (1 - wet) + b.samples[i] * wet;
        }
    }
    limiter_.process(b);
    snapshotFrames_ += b.frames();
    if (snapshotFrames_ >= static_cast<uint64_t>(rate_ / 30)) {
        snapshotFrames_ = 0;
        AnalyzerSnapshot s;
        s.reductionDb = limiter_.reductionDb();
        for (uint32_t f = 0; f < b.frames(); ++f) {
            float l = b.at(f, 0), r = b.at(f, std::min(1u, b.channels - 1));
            s.peakL = std::max(s.peakL, std::abs(l));
            s.peakR = std::max(s.peakR, std::abs(r));
            s.rmsL += l * l;
            s.rmsR += r * r;
        }
        if (b.frames()) {
            s.rmsL = std::sqrt(s.rmsL / b.frames());
            s.rmsR = std::sqrt(s.rmsR / b.frames());
            for (size_t i = 0; i < 128; ++i)
                s.waveform[i] = b.at(static_cast<uint32_t>(i * b.frames() / 128), 0);
        }
        (void)snapshots_.push(s);
    }
}
} // namespace miyazato
