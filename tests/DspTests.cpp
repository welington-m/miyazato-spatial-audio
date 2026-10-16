#include "engine/dsp/Dsp.h"
#include <catch2/catch_approx.hpp>
#include <catch2/catch_test_macros.hpp>
#include <cmath>
#include <limits>
#include <numbers>
#include <thread>
using namespace miyazato;
using Catch::Approx;
namespace {
void sine(AudioBufferView b, double frequency, double rate, float amplitude = 0.1f,
          uint64_t offset = 0) {
    for (uint32_t f = 0; f < b.frames(); ++f)
        for (uint32_t c = 0; c < b.channels; ++c)
            b.at(f, c) = amplitude * static_cast<float>(std::sin(2 * std::numbers::pi * frequency *
                                                                 (f + offset) / rate));
}
double energy(AudioBufferView b) {
    double sum = 0;
    for (float x : b.samples)
        sum += x * x;
    return std::sqrt(sum / b.samples.size());
}
} // namespace
TEST_CASE("Buffer rejects overflow and invalid channel counts") {
    AudioBuffer b;
    REQUIRE_THROWS(b.prepare(0, 128));
    b.prepare(2, 128);
    REQUIRE(b.view(128).frames() == 128);
    REQUIRE_THROWS(b.view(129));
}
TEST_CASE("Smoothed gain reaches target and avoids instantaneous jump") {
    Gain g;
    g.prepare(48000, 2, 4800);
    g.setGainDb(-6);
    AudioBuffer b;
    b.prepare(2, 4800);
    auto v = b.view(4800);
    std::fill(v.samples.begin(), v.samples.end(), 1);
    g.process(v);
    REQUIRE(v.at(0, 0) > 0.99f);
    REQUIRE(v.at(4799, 0) == Approx(0.501187f).margin(1e-5));
    REQUIRE(v.at(2000, 0) == v.at(2000, 1));
}
TEST_CASE("Limiter links channels and protects output from non-finite samples") {
    Limiter l;
    l.prepare(48000, 2, 4);
    AudioBuffer b;
    b.prepare(2, 4);
    auto v = b.view(4);
    v.at(0, 0) = 4;
    v.at(0, 1) = 2;
    v.at(1, 0) = std::numeric_limits<float>::infinity();
    v.at(1, 1) = std::numeric_limits<float>::quiet_NaN();
    l.process(v);
    REQUIRE(v.at(0, 0) == Approx(0.98));
    REQUIRE(v.at(0, 1) == Approx(0.49));
    REQUIRE(l.reductionDb() > 12);
    for (float x : v.samples) {
        REQUIRE(std::isfinite(x));
        REQUIRE(std::abs(x) <= 0.98f);
    }
}
TEST_CASE("Parametric EQ produces expected center gain at all initial sample rates") {
    for (double rate : {44100., 48000., 96000.}) {
        ParametricEQ eq;
        eq.prepare(rate, 2, 512);
        auto bands = defaultProfile().eq;
        for (auto &b : bands)
            b.enabled = false;
        bands[5] = {1000, 6, 0.707f, true, FilterType::Peak};
        eq.setBands(bands);
        AudioBuffer b;
        b.prepare(2, 512);
        uint64_t offset = 0;
        double ratio = 0;
        for (int block = 0; block < 50; ++block) {
            auto v = b.view(512);
            sine(v, 1000, rate, 0.1f, offset);
            auto before = energy(v);
            eq.process(v);
            ratio = energy(v) / before;
            offset += 512;
        }
        REQUIRE(ratio == Approx(std::pow(10., 6. / 20)).epsilon(0.02));
    }
}
TEST_CASE("Filters remain finite throughout live frequency and Q transitions") {
    ParametricEQ eq;
    eq.prepare(48000, 2, 256);
    AudioBuffer b;
    b.prepare(2, 256);
    auto bands = defaultProfile().eq;
    for (int block = 0; block < 300; ++block) {
        if (block % 20 == 0) {
            for (size_t i = 0; i < 10; ++i) {
                bands[i].type = static_cast<FilterType>((block / 20) % 5);
                bands[i].gainDb = block % 40 ? 12 : -12;
                bands[i].frequency = 20 + static_cast<float>(i) * 2000;
                bands[i].q = block % 40 ? 0.1f : 12.f;
            }
            eq.setBands(bands);
        }
        auto v = b.view(256);
        sine(v, 1000, 48000, 0.1f, static_cast<uint64_t>(block) * 256);
        eq.process(v);
        for (float x : v.samples)
            REQUIRE(std::isfinite(x));
    }
}
TEST_CASE("Chain handles silence, overload, bypass and publishes bounded analyzer snapshots") {
    DSPChain chain;
    chain.prepare(48000, 2, 256);
    AudioBuffer b;
    b.prepare(2, 256);
    auto p = defaultProfile();
    p.bass = 100;
    p.clarity = 100;
    p.width = 200;
    p.outputDb = 6;
    REQUIRE(chain.submit(p));
    for (int block = 0; block < 100; ++block) {
        auto v = b.view(256);
        sine(v, 80, 48000, 4, static_cast<uint64_t>(block) * 256);
        chain.process(v);
        for (float x : v.samples) {
            REQUIRE(std::isfinite(x));
            REQUIRE(std::abs(x) <= 0.980001f);
        }
    }
    AnalyzerSnapshot snapshot;
    REQUIRE(chain.snapshot(snapshot));
    REQUIRE(snapshot.peakL <= 0.980001f);
    p.bypass = true;
    REQUIRE(chain.submit(p));
    for (int i = 0; i < 200; ++i) {
        auto v = b.view(256);
        std::fill(v.samples.begin(), v.samples.end(), 0.2f);
        chain.process(v);
    }
    REQUIRE(b.view(256).at(255, 0) == Approx(0.1002374f).margin(1e-4));
    chain.reset();
    auto v = b.view(256);
    std::fill(v.samples.begin(), v.samples.end(), 0);
    chain.process(v);
    for (float x : v.samples)
        REQUIRE(x == 0);
}
TEST_CASE("SPSC rejects overflow without overwriting queued commands") {
    SpscQueue<int, 4> q;
    REQUIRE(q.push(1));
    REQUIRE(q.push(2));
    REQUIRE(q.push(3));
    REQUIRE_FALSE(q.push(4));
    int x = 0;
    REQUIRE(q.pop(x));
    REQUIRE(x == 1);
    REQUIRE(q.pop(x));
    REQUIRE(x == 2);
    REQUIRE(q.pop(x));
    REQUIRE(x == 3);
    REQUIRE_FALSE(q.pop(x));
}
TEST_CASE("SPSC preserves ordering across producer and consumer threads") {
    SpscQueue<uint32_t, 256> q;
    std::jthread producer([&] {
        for (uint32_t i = 0; i < 100000; ++i)
            while (!q.push(i))
                std::this_thread::yield();
    });
    for (uint32_t i = 0; i < 100000; ++i) {
        uint32_t value;
        while (!q.pop(value))
            std::this_thread::yield();
        REQUIRE(value == i);
    }
}
TEST_CASE("Compressor reduces sustained input without boosting unrelated channels") {
    DSPChain a, b;
    a.prepare(48000, 2, 256);
    b.prepare(48000, 2, 256);
    auto p = defaultProfile();
    p.compressorEnabled = true;
    p.thresholdDb = -30;
    p.ratio = 8;
    REQUIRE(b.submit(p));
    AudioBuffer ba, bb;
    ba.prepare(2, 256);
    bb.prepare(2, 256);
    for (int i = 0; i < 200; ++i) {
        sine(ba.view(256), 500, 48000, 0.5f, static_cast<uint64_t>(i) * 256);
        std::copy(ba.view(256).samples.begin(), ba.view(256).samples.end(),
                  bb.view(256).samples.begin());
        a.process(ba.view(256));
        b.process(bb.view(256));
    }
    REQUIRE(energy(bb.view(256)) < energy(ba.view(256)) * 0.3);
}

TEST_CASE("Invalid profiles are rejected before realtime processing") {
    DSPChain chain;
    auto p = defaultProfile();
    p.eq[0].q = 0;
    REQUIRE_FALSE(chain.submit(p));
    p = defaultProfile();
    p.bass = std::numeric_limits<float>::quiet_NaN();
    REQUIRE_FALSE(chain.submit(p));
    p = defaultProfile();
    p.outputDb = 7;
    REQUIRE_FALSE(chain.submit(p));
}
TEST_CASE("Bass enhancement boosts low frequencies selectively") {
    auto measure = [](double frequency, float bass) {
        DSPChain chain;
        chain.prepare(48000, 2, 256);
        auto p = defaultProfile();
        p.bass = bass;
        p.bassIntensity = 100;
        REQUIRE(chain.submit(p));
        AudioBuffer buffer;
        buffer.prepare(2, 256);
        for (int i = 0; i < 120; ++i) {
            auto v = buffer.view(256);
            sine(v, frequency, 48000, 0.05f, static_cast<uint64_t>(i) * 256);
            chain.process(v);
        }
        return energy(buffer.view(256));
    };
    REQUIRE(measure(50, 100) / measure(50, 0) > 1.7);
    REQUIRE(measure(4000, 100) / measure(4000, 0) == Approx(1.0).epsilon(0.01));
}
