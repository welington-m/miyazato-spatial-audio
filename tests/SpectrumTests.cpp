#include "engine/dsp/Dsp.h"
#include "engine/dsp/analyzer/AnalyzerMix.h"
#include "engine/dsp/analyzer/SpectrumAnalyzer.h"
#include <algorithm>
#include <catch2/catch_approx.hpp>
#include <catch2/catch_test_macros.hpp>
#include <cmath>
#include <cstring>
#include <limits>
#include <numbers>
#include <thread>
using namespace miyazato;
using Catch::Approx;
namespace {
std::vector<float> tone(size_t n, double frequency, double rate, float level = 0.5f,
                        uint64_t offset = 0) {
    std::vector<float> samples(n);
    for (size_t i = 0; i < n; ++i)
        samples[i] = level * static_cast<float>(
                                 std::sin(2 * std::numbers::pi * frequency * (i + offset) / rate));
    return samples;
}
size_t region(const SpectrumFrame &frame, double frequency) {
    return std::min(spectrumBinCount - 1,
                    static_cast<size_t>(std::log(frequency / frame.minFrequency) /
                                        std::log(frame.maxFrequency / frame.minFrequency) *
                                        spectrumBinCount));
}
float nearby(const SpectrumFrame &frame, double frequency) {
    const auto index = region(frame, frequency);
    return *std::max_element(frame.bins.begin() + (index ? index - 1 : 0),
                             frame.bins.begin() + std::min(spectrumBinCount, index + 2));
}
bool awaitFrame(SpectrumAnalyzer &analyzer, SpectrumFrame &frame) {
    const auto end = std::chrono::steady_clock::now() + std::chrono::seconds(2);
    while (std::chrono::steady_clock::now() < end) {
        if (analyzer.snapshot(frame))
            return true;
        std::this_thread::sleep_for(std::chrono::milliseconds(2));
    }
    return false;
}
} // namespace
TEST_CASE("FFT detects real sine-wave frequency regions with resolution-based tolerance") {
    for (double rate : {44100., 48000., 96000.}) {
        SpectrumFft fft;
        fft.prepare(rate);
        for (double frequency : {100., 440., 1000., 5000., 10000.}) {
            auto input = tone(2048, frequency, rate);
            SpectrumFrame frame;
            REQUIRE(fft.analyze(input, frame));
            const auto index = static_cast<size_t>(
                std::max_element(frame.bins.begin(), frame.bins.end()) - frame.bins.begin());
            const double low =
                frame.minFrequency * std::pow(frame.maxFrequency / frame.minFrequency,
                                              static_cast<double>(index) / spectrumBinCount);
            const double high =
                low * std::pow(frame.maxFrequency / frame.minFrequency, 1.0 / spectrumBinCount);
            const double resolution = rate / frame.fftSize;
            INFO("rate=" << rate << " frequency=" << frequency << " detected=" << low << ".."
                         << high);
            REQUIRE(frequency >= low - resolution);
            REQUIRE(frequency <= high + resolution);
            REQUIRE(nearby(frame, frequency) > -10);
        }
    }
}
TEST_CASE("Periodic Hann normalization is peak dBFS, with no positive display overflow") {
    SpectrumFft fft;
    fft.prepare(48000);
    for (const float amplitude : {1.f, 0.5f, 0.1f}) {
        SpectrumFrame frame;
        auto input = tone(2048, 48000. * 64 / 2048, 48000, amplitude);
        REQUIRE(fft.analyze(input, frame));
        REQUIRE(*std::max_element(frame.bins.begin(), frame.bins.end()) ==
                Approx(20 * std::log10(amplitude)).margin(0.01));
        for (auto db : frame.bins)
            REQUIRE(db <= 0);
    }
}
TEST_CASE("Silence and DC settle at floor, and nonfinite input is contained") {
    SpectrumFft fft;
    fft.prepare(48000);
    SpectrumFrame frame;
    std::vector<float> input(2048, 0);
    for (float dc : {0.f, 0.2f, -0.7f}) {
        std::fill(input.begin(), input.end(), dc);
        REQUIRE(fft.analyze(input, frame));
        for (auto db : frame.bins)
            REQUIRE(db == -90);
    }
    input[50] = std::numeric_limits<float>::quiet_NaN();
    input[70] = std::numeric_limits<float>::infinity();
    REQUIRE(fft.analyze(input, frame));
    for (auto db : frame.bins)
        REQUIRE(std::isfinite(db));
}
TEST_CASE("Dual-tone FFT retains both frequency regions") {
    SpectrumFft fft;
    fft.prepare(48000);
    auto input = tone(2048, 440, 48000, 0.2f);
    auto second = tone(2048, 1000, 48000, 0.2f);
    for (size_t i = 0; i < input.size(); ++i)
        input[i] += second[i];
    SpectrumFrame frame;
    REQUIRE(fft.analyze(input, frame));
    REQUIRE(nearby(frame, 440) > -17);
    REQUIRE(nearby(frame, 1000) > -17);
    REQUIRE(nearby(frame, 5000) < -60);
}
TEST_CASE("FFT supports future sizes, sample-rate changes, and Nyquist bounds") {
    SpectrumFft fft;
    for (const size_t size : {1024u, 2048u, 4096u, 8192u}) {
        SpectrumConfig config;
        config.fftSize = size;
        fft.prepare(48000, config);
        SpectrumFrame frame;
        REQUIRE(fft.analyze(tone(size, 1000, 48000), frame));
        REQUIRE(frame.fftSize == size);
        REQUIRE(frame.sampleRate == 48000);
        REQUIRE(nearby(frame, 1000) > -9);
    }
    fft.prepare(8000);
    SpectrumFrame frame;
    REQUIRE(fft.analyze(tone(2048, 1000, 8000), frame));
    REQUIRE(frame.maxFrequency == 4000);
    REQUIRE(nearby(frame, 1000) > -9);
    REQUIRE_FALSE(fft.analyze(std::vector<float>(100), frame));
    SpectrumConfig invalid;
    invalid.fftSize = 2000;
    REQUIRE_THROWS(fft.prepare(48000, invalid));
    REQUIRE_THROWS(fft.prepare(0));
    invalid = {};
    invalid.attackMs = 0;
    REQUIRE_THROWS(fft.prepare(48000, invalid));
}
TEST_CASE("Tap and FFT preserve every sample bit, including saturated and invalid input") {
    SpectrumAnalyzer analyzer;
    REQUIRE(analyzer.start(48000));
    auto input = tone(8192, 440, 48000);
    input[0] = -0.0f;
    input[1] = std::numeric_limits<float>::quiet_NaN();
    input[2] = std::numeric_limits<float>::infinity();
    input[3] = 4;
    const auto before = input;
    analyzer.tap(input, 2);
    REQUIRE(std::memcmp(input.data(), before.data(), input.size() * sizeof(float)) == 0);
    SpectrumFft fft;
    fft.prepare(48000);
    SpectrumFrame frame;
    REQUIRE(fft.analyze(std::span<const float>(input).first(2048), frame));
    REQUIRE(std::memcmp(input.data(), before.data(), input.size() * sizeof(float)) == 0);
}
TEST_CASE("Real worker publishes measured bins and instrumentation, resets on restart") {
    SpectrumAnalyzer analyzer;
    REQUIRE(analyzer.start(48000));
    // Feed a true stereo sine, with identical L/R samples.
    auto mono = tone(2048, 1000, 48000);
    std::vector<float> stereo(4096);
    for (size_t i = 0; i < mono.size(); ++i)
        stereo[i * 2] = stereo[i * 2 + 1] = mono[i];
    analyzer.tap(stereo, 2);
    SpectrumFrame frame;
    REQUIRE(awaitFrame(analyzer, frame));
    REQUIRE(frame.fftSize == 2048);
    REQUIRE(frame.sampleRate == 48000);
    REQUIRE(frame.timestamp > 0);
    REQUIRE(frame.sequence > 0);
    REQUIRE(frame.computeMs >= 0);
    REQUIRE(frame.updatesPerSecond > 0);
    REQUIRE(nearby(frame, 1000) > nearby(frame, 10000));
    analyzer.stop();
    REQUIRE_FALSE(analyzer.available());
    REQUIRE(analyzer.start(44100));
    analyzer.tap(tone(2048, 440, 44100), 1);
    REQUIRE(awaitFrame(analyzer, frame));
    REQUIRE(frame.sampleRate == 44100);
    REQUIRE(frame.sequence == 1);
}
TEST_CASE("Combined stereo spectrum cancels equal and opposite channels") {
    SpectrumAnalyzer analyzer;
    REQUIRE(analyzer.start(48000));
    auto mono = tone(2048, 1000, 48000);
    std::vector<float> stereo(4096);
    for (size_t i = 0; i < mono.size(); ++i) {
        stereo[i * 2] = mono[i];
        stereo[i * 2 + 1] = -mono[i];
    }
    analyzer.tap(stereo, 2);
    SpectrumFrame frame;
    REQUIRE(awaitFrame(analyzer, frame));
    for (auto db : frame.bins)
        REQUIRE(db == -90);
}
TEST_CASE("Full analyzer queue drops data without waiting or corrupting audio") {
    SpectrumAnalyzer analyzer;
    SpectrumConfig config;
    config.updatesPerSecond = 1;
    REQUIRE(analyzer.start(48000, config));
    auto input = tone(256 * 1024, 1000, 48000);
    const auto before = input;
    analyzer.tap(input, 1);
    REQUIRE(analyzer.droppedBlocks() > 0);
    REQUIRE(input == before);
    analyzer.stop();
    REQUIRE_FALSE(analyzer.start(0));
    analyzer.tap(input, 1);
    REQUIRE(input == before);
}
TEST_CASE("Attaching, overflowing and disabling analysis leaves DSP output bit-identical") {
    DSPChain reference, observed;
    reference.prepare(48000, 2, 256);
    observed.prepare(48000, 2, 256);
    SpectrumAnalyzer analyzer;
    REQUIRE(analyzer.start(48000));
    auto profile = defaultProfile();
    profile.bass = 80;
    profile.width = 135;
    profile.compressorEnabled = true;
    profile.outputDb = 6;
    REQUIRE(reference.submit(profile));
    REQUIRE(observed.submit(profile));
    AudioBuffer a, b;
    a.prepare(2, 256);
    b.prepare(2, 256);
    for (size_t block = 0; block < 160; ++block) {
        auto av = a.view(256), bv = b.view(256);
        auto source = tone(512, block % 2 ? 80 : 5000, 48000, 3, block * 512);
        std::copy(source.begin(), source.end(), av.samples.begin());
        std::copy(source.begin(), source.end(), bv.samples.begin());
        if (block == 80) {
            reference.setBypass(true);
            observed.setBypass(true);
            analyzer.stop();
        }
        reference.process(av);
        observed.process(bv);
        analyzer.tap(bv.samples, bv.channels);
        REQUIRE(std::memcmp(av.samples.data(), bv.samples.data(), av.samples.size_bytes()) == 0);
    }
}

TEST_CASE("A UI frame consumer remains safe while audio sessions restart") {
    SpectrumAnalyzer analyzer;
    std::atomic<bool> invalid{};
    std::atomic<uint64_t> received{};
    std::jthread ui([&](std::stop_token stop) {
        SpectrumFrame frame;
        while (!stop.stop_requested()) {
            if (analyzer.snapshot(frame)) {
                if (frame.generation == 0 || frame.sequence == 0 ||
                    (frame.sampleRate != 48000 && frame.sampleRate != 44100))
                    invalid = true;
                for (auto db : frame.bins)
                    if (!std::isfinite(db) || db < frame.floorDb || db > 0)
                        invalid = true;
                ++received;
            } else
                std::this_thread::yield();
        }
    });
    for (int session = 0; session < 6; ++session) {
        const double rate = session % 2 ? 44100 : 48000;
        REQUIRE(analyzer.start(rate));
        analyzer.tap(tone(2048, 1000, rate), 1);
        std::this_thread::sleep_for(std::chrono::milliseconds(40));
        analyzer.stop();
    }
    ui.request_stop();
    ui.join();
    REQUIRE(received > 0);
    REQUIRE_FALSE(invalid.load());
}

TEST_CASE("High-frequency tones do not acquire a false low-frequency DC-removal peak") {
    SpectrumFft fft;
    fft.prepare(48000);
    for (const double frequency : {5000., 10000.}) {
        SpectrumFrame frame;
        REQUIRE(fft.analyze(tone(2048, frequency, 48000), frame));
        REQUIRE(nearby(frame, 25) < -80);
        REQUIRE(nearby(frame, frequency) > -9);
    }
}

TEST_CASE("Endpoint analyzer decodes PCM containers and averages surround without modifying data") {
    using namespace miyazato::analysis;
    const std::array<unsigned char, 3> negative24{0, 0, 0x80};
    REQUIRE(decode(negative24.data(), 24, 24, false) == -1.f);
    const std::array<unsigned char, 4> positive24in32{0, 0, 0, 0x40};
    REQUIRE(decode(positive24in32.data(), 32, 24, false) == Approx(0.5f));
    const std::array<unsigned char, 2> negative16{0, 0x80};
    REQUIRE(decode(negative16.data(), 16, 16, false) == -1.f);
    const unsigned char unsignedSilence = 128;
    REQUIRE(decode(&unsignedSilence, 8, 8, false) == 0.f);
    std::array<float, 12> surround{1, 0, 0, 0, 0, -1, .6f, .6f, .6f, .6f, .6f, .6f};
    const auto original = surround;
    std::array<float, 2> mono{};
    mixMono(reinterpret_cast<const unsigned char *>(surround.data()), mono, 6, 32, 32, true, false);
    REQUIRE(mono[0] == 0.f);
    REQUIRE(mono[1] == Approx(.6f));
    REQUIRE(surround == original);
    mixMono(nullptr, mono, 6, 32, 32, true, true);
    REQUIRE(mono == std::array<float, 2>{0.f, 0.f});
    const double sample = .25;
    REQUIRE(decode(reinterpret_cast<const unsigned char *>(&sample), 64, 64, true) == .25f);
}
