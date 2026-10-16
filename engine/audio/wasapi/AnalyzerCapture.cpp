#include "engine/audio/wasapi/AnalyzerCapture.h"
#include "engine/audio/wasapi/Devices.h"
#include <audioclient.h>
#include "engine/dsp/analyzer/AnalyzerMix.h"
#include <stdexcept>
#include <ks.h>
#include <ksmedia.h>
#include <algorithm>
#include <array>
#include <cmath>
#include <cstring>
#include <memory>

namespace miyazato::windows {
using Microsoft::WRL::ComPtr;
namespace {
struct ComScope {
    HRESULT result{CoInitializeEx(nullptr, COINIT_MULTITHREADED)};
    ~ComScope() { if (SUCCEEDED(result)) CoUninitialize(); }
};
struct IdFree { void operator()(wchar_t *id) const { CoTaskMemFree(id); } };
struct FormatFree { void operator()(WAVEFORMATEX *f) const { CoTaskMemFree(f); } };
struct Event {
    HANDLE value{CreateEventW(nullptr, FALSE, FALSE, nullptr)};
    ~Event() { if (value) CloseHandle(value); }
};
struct StopClient {
    IAudioClient *client;
    ~StopClient() { client->Stop(); }
};
struct Packet {
    IAudioCaptureClient *client;
    UINT32 frames;
    ~Packet() { client->ReleaseBuffer(frames); }
};

}
void AnalyzerCapture::stop() noexcept {
    state_ = AnalyzerState::Stopping;
    if (acquisition_.joinable()) { acquisition_.request_stop(); acquisition_.join(); }
    spectrum_.stop();
    state_ = AnalyzerState::Stopped;
}
void AnalyzerCapture::start(const std::wstring &endpoint, AnalyzerSource source) noexcept {
    stop();
    state_ = AnalyzerState::Starting;
    sampleRate_ = 0;
    channels_ = 0;
    acquisitionCpuMs_ = 0;
    deviceChanged_ = false;
    try { acquisition_ = std::jthread([this, endpoint, source](std::stop_token t) { run(t, endpoint, source); }); }
    catch (...) { state_ = AnalyzerState::Unavailable; }
}
void AnalyzerCapture::run(std::stop_token token, std::wstring endpoint, AnalyzerSource source) noexcept {
    ComScope com;
    if (FAILED(com.result)) { state_ = AnalyzerState::Unavailable; return; }
    // Retry unavailable/invalidated endpoints without touching playback. Empty ID follows default.
    while (!token.stop_requested()) {
        try {
            ComPtr<IMMDeviceEnumerator> enumerator;
            check(CoCreateInstance(__uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL,
                                   IID_PPV_ARGS(&enumerator)), "Analyzer enumerator");
            const auto flow = source == AnalyzerSource::OutputLoopback ? eRender : eCapture;
            ComPtr<IMMDevice> device;
            if (endpoint.empty()) check(enumerator->GetDefaultAudioEndpoint(flow, eConsole, &device), "Analyzer default");
            else check(enumerator->GetDevice(endpoint.c_str(), &device), "Analyzer endpoint");
            ComPtr<IMMEndpoint> direction;
            check(device.As(&direction), "Analyzer direction");
            EDataFlow actual{};
            check(direction->GetDataFlow(&actual), "Analyzer flow");
            if (actual != flow) throw std::runtime_error("Analyzer endpoint direction mismatch");
            LPWSTR id{};
            check(device->GetId(&id), "Analyzer ID");
            std::unique_ptr<wchar_t, IdFree> ownedId(id);
            std::wstring activeId(ownedId.get());
            ComPtr<IAudioClient> client;
            check(device->Activate(__uuidof(IAudioClient), CLSCTX_ALL, nullptr, &client), "Analyzer activate");
            WAVEFORMATEX *raw{};
            check(client->GetMixFormat(&raw), "Analyzer format");
            std::unique_ptr<WAVEFORMATEX, FormatFree> format(raw);
            bool floating = raw->wFormatTag == WAVE_FORMAT_IEEE_FLOAT;
            bool pcm = raw->wFormatTag == WAVE_FORMAT_PCM;
            unsigned validBits = raw->wBitsPerSample;
            if (raw->wFormatTag == WAVE_FORMAT_EXTENSIBLE && raw->cbSize >= 22) {
                const auto *ext = reinterpret_cast<WAVEFORMATEXTENSIBLE *>(raw);
                floating = IsEqualGUID(ext->SubFormat, KSDATAFORMAT_SUBTYPE_IEEE_FLOAT);
                pcm = IsEqualGUID(ext->SubFormat, KSDATAFORMAT_SUBTYPE_PCM);
                validBits = ext->Samples.wValidBitsPerSample;
            }
            const auto bits = raw->wBitsPerSample;
            if (!raw->nChannels || !raw->nSamplesPerSec ||
                !((floating && (bits == 32 || bits == 64)) ||
                  (pcm && (bits == 8 || bits == 16 || bits == 24 || bits == 32))) ||
                !validBits || validBits > bits || raw->nBlockAlign != raw->nChannels * (bits / 8))
                throw std::runtime_error("Unsupported analyzer format");
            Event event;
            if (!event.value) throw std::runtime_error("Analyzer event");
            const DWORD flags = AUDCLNT_STREAMFLAGS_EVENTCALLBACK |
                (flow == eRender ? AUDCLNT_STREAMFLAGS_LOOPBACK : 0);
            check(client->Initialize(AUDCLNT_SHAREMODE_SHARED, flags, 0, 0, raw, nullptr), "Analyzer initialize");
            check(client->SetEventHandle(event.value), "Analyzer event handle");
            ComPtr<IAudioCaptureClient> capture;
            check(client->GetService(IID_PPV_ARGS(&capture)), "Analyzer service");
            if (!spectrum_.start(raw->nSamplesPerSec)) throw std::runtime_error("Analyzer worker");
            StopClient stop{client.Get()};
            check(client->Start(), "Analyzer start");
            sampleRate_ = raw->nSamplesPerSec;
            channels_ = raw->nChannels;
            state_ = AnalyzerState::Running;
            auto lastDefaultCheck = std::chrono::steady_clock::now();
            auto lastSamples = lastDefaultCheck;
            auto lastSilence = lastDefaultCheck;
            std::array<float, 256> mono{};
            while (!token.stop_requested()) {
                if (WaitForSingleObject(event.value, 20) == WAIT_FAILED) throw std::runtime_error("Analyzer wait");
                const auto now = std::chrono::steady_clock::now();
                if (!spectrum_.available()) throw std::runtime_error("Analyzer worker stopped");
                if (deviceChanged_.exchange(false) ||
                    now - lastDefaultCheck >= std::chrono::milliseconds(500)) {
                    lastDefaultCheck = now;
                    FILETIME creation{}, exit{}, kernel{}, user{};
                    if (GetThreadTimes(GetCurrentThread(), &creation, &exit, &kernel, &user)) {
                        const auto ticks = [](FILETIME t) { return (uint64_t(t.dwHighDateTime) << 32) | t.dwLowDateTime; };
                        acquisitionCpuMs_ = (ticks(kernel) + ticks(user)) / 10000.0;
                    }
                    DWORD deviceState{};
                    check(device->GetState(&deviceState), "Analyzer endpoint state");
                    if (analyzerEndpointChanged(endpoint.empty(), true, deviceState == DEVICE_STATE_ACTIVE)) break;
                    if (endpoint.empty()) {
                        ComPtr<IMMDevice> current;
                        check(enumerator->GetDefaultAudioEndpoint(flow, eConsole, &current), "Analyzer default change");
                        LPWSTR currentId{};
                        check(current->GetId(&currentId), "Analyzer default ID");
                        std::unique_ptr<wchar_t, IdFree> ownedCurrentId(currentId);
                        const bool changed = activeId != ownedCurrentId.get();
                        if (analyzerEndpointChanged(true, !changed, true)) break;
                    }
                }
                UINT32 count{};
                check(capture->GetNextPacketSize(&count), "Analyzer packet size");
                bool received = false;
                while (count && !token.stop_requested()) {
                    BYTE *data{}; UINT32 frames{}; DWORD packetFlags{};
                    check(capture->GetBuffer(&data, &frames, &packetFlags, nullptr, nullptr), "Analyzer buffer");
                    {
                        Packet packet{capture.Get(), frames};
                        for (UINT32 offset = 0; offset < frames; offset += static_cast<UINT32>(mono.size())) {
                            const auto n = std::min<size_t>(mono.size(), frames - offset);
                            analysis::mixMono(data ? data + offset * raw->nBlockAlign : nullptr,
                                std::span<float>(mono.data(), n), raw->nChannels, bits, validBits,
                                floating, (packetFlags & AUDCLNT_BUFFERFLAGS_SILENT) != 0);
                            spectrum_.tap(std::span<const float>(mono.data(), n), 1);
                        }
                    }
                    received = true;
                    check(capture->GetNextPacketSize(&count), "Analyzer next packet");
                }
                if (received) lastSamples = now;
                // Idle loopback endpoints may deliver no packets at all. Supply measured silence
                // after a grace period so FFT release smoothing can reach the floor.
                else if (now - lastSamples >= std::chrono::milliseconds(100) &&
                         now - lastSilence >= std::chrono::milliseconds(20)) {
                    lastSilence = now;
                    mono.fill(0);
                    auto remaining = raw->nSamplesPerSec / 50;
                    while (remaining) {
                        const auto n = std::min<size_t>(remaining, mono.size());
                        spectrum_.tap(std::span<const float>(mono.data(), n), 1);
                        remaining -= static_cast<unsigned>(n);
                    }
                    // Wait above bounds silence production to the acquisition cadence.
                }
            }
        } catch (...) {
            state_ = analyzerFailureState(state());
        }
        if (state() == AnalyzerState::Running) state_ = AnalyzerState::Recovering;
        spectrum_.stop();
        for (int i = 0; i < 25 && !token.stop_requested(); ++i) {
            if (deviceChanged_.exchange(false)) break;
            std::this_thread::sleep_for(std::chrono::milliseconds(20));
        }
    }
}
}
