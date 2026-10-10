#include "engine/audio/wasapi/LoopbackEngine.h"
#include "engine/audio/wasapi/Devices.h"
#include <audioclient.h>
#include <avrt.h>
#include <chrono>
#include <cstring>
#include <ks.h>
#include <ksmedia.h>
#include <memory>
#include <wrl/client.h>
namespace miyazato::windows {
using Microsoft::WRL::ComPtr;
namespace {
struct Handle {
    HANDLE h{};
    ~Handle() {
        if (h)
            CloseHandle(h);
    }
};
struct ComScope {
    HRESULT hr{CoInitializeEx(nullptr, COINIT_MULTITHREADED)};
    ~ComScope() {
        if (SUCCEEDED(hr))
            CoUninitialize();
    }
};
struct TaskScope {
    HANDLE handle{};
    ~TaskScope() {
        if (handle)
            AvRevertMmThreadCharacteristics(handle);
    }
};
struct FormatFree {
    void operator()(WAVEFORMATEX *p) const { CoTaskMemFree(p); }
};
struct ClientStop {
    IAudioClient *a{};
    IAudioClient *b{};
    ~ClientStop() {
        if (a)
            a->Stop();
        if (b)
            b->Stop();
    }
};
bool isFloat(WAVEFORMATEX *f) {
    return f->wBitsPerSample == 32 &&
           (f->wFormatTag == WAVE_FORMAT_IEEE_FLOAT ||
            (f->wFormatTag == WAVE_FORMAT_EXTENSIBLE &&
             IsEqualGUID(reinterpret_cast<WAVEFORMATEXTENSIBLE *>(f)->SubFormat,
                         KSDATAFORMAT_SUBTYPE_IEEE_FLOAT)));
}
} // namespace
void LoopbackEngine::start(const std::wstring &source, const std::wstring &sink) {
    if (source.empty() || sink.empty() || source == sink)
        throw std::runtime_error("Choose distinct source and output endpoints to prevent feedback");
    stop();
    {
        std::lock_guard lock(errorMutex_);
        error_.clear();
    }
    underruns_ = 0;
    overruns_ = 0;
    glitches_ = 0;
    chain_.discardPending();
    (void)chain_.submit(desired_);
    accepting_ = true;
    worker_ =
        std::jthread([this, source, sink](std::stop_token token) { run(token, source, sink); });
}
void LoopbackEngine::stop() {
    if (worker_.joinable()) {
        worker_.request_stop();
        worker_.join();
    }
    running_ = false;
    accepting_ = false;
}
EngineStatus LoopbackEngine::status() const {
    std::lock_guard lock(errorMutex_);
    return {running_.load(),
            underruns_.load(),
            overruns_.load(),
            glitches_.load(),
            latency_.load(),
            callbackMs_.load(),
            error_};
}
void LoopbackEngine::run(std::stop_token token, std::wstring source, std::wstring sink) noexcept {
    try {
        ComScope com;
        check(com.hr, "Audio COM");
        ComPtr<IMMDeviceEnumerator> e;
        check(CoCreateInstance(__uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL, IID_PPV_ARGS(&e)),
              "Enumerator");
        ComPtr<IMMDevice> inputDevice, outputDevice;
        check(e->GetDevice(source.c_str(), &inputDevice), "Source endpoint");
        check(e->GetDevice(sink.c_str(), &outputDevice), "Output endpoint");
        ComPtr<IAudioClient> capture, render;
        check(inputDevice->Activate(__uuidof(IAudioClient), CLSCTX_ALL, nullptr, &capture),
              "Capture activate");
        check(outputDevice->Activate(__uuidof(IAudioClient), CLSCTX_ALL, nullptr, &render),
              "Render activate");
        WAVEFORMATEX *cf{}, *rf{};
        check(capture->GetMixFormat(&cf), "Source format");
        std::unique_ptr<WAVEFORMATEX, FormatFree> cfmt(cf);
        check(render->GetMixFormat(&rf), "Output format");
        std::unique_ptr<WAVEFORMATEX, FormatFree> rfmt(rf);
        if (!isFloat(cf) || !isFloat(rf) || cf->nSamplesPerSec != rf->nSamplesPerSec ||
            cf->nChannels != 2 || rf->nChannels != 2)
            throw std::runtime_error("Prototype requires equal-rate, stereo, float32 source and "
                                     "output; resampling is not implemented");
        Handle captureEvent{CreateEventW(nullptr, FALSE, FALSE, nullptr)},
            renderEvent{CreateEventW(nullptr, FALSE, FALSE, nullptr)};
        if (!captureEvent.h || !renderEvent.h)
            throw std::runtime_error("Audio event creation failed");
        check(capture->Initialize(AUDCLNT_SHAREMODE_SHARED,
                                  AUDCLNT_STREAMFLAGS_LOOPBACK | AUDCLNT_STREAMFLAGS_EVENTCALLBACK,
                                  0, 0, cf, nullptr),
              "Capture initialize");
        check(render->Initialize(AUDCLNT_SHAREMODE_SHARED, AUDCLNT_STREAMFLAGS_EVENTCALLBACK, 0, 0,
                                 rf, nullptr),
              "Render initialize");
        check(capture->SetEventHandle(captureEvent.h), "Capture event");
        check(render->SetEventHandle(renderEvent.h), "Render event");
        UINT32 captureSize{}, renderSize{};
        check(capture->GetBufferSize(&captureSize), "Capture capacity");
        check(render->GetBufferSize(&renderSize), "Render capacity");
        ComPtr<IAudioCaptureClient> in;
        ComPtr<IAudioRenderClient> out;
        check(capture->GetService(IID_PPV_ARGS(&in)), "Capture service");
        check(render->GetService(IID_PPV_ARGS(&out)), "Render service");
        const auto block = std::max(captureSize, renderSize);
        chain_.prepare(cf->nSamplesPerSec, 2, block);
        AudioBuffer buffer;
        buffer.prepare(2, block);
        // A bounded frame FIFO absorbs endpoint scheduling skew; long-running clock drift is a
        // known limitation.
        const size_t capacity = static_cast<size_t>(block) * 8;
        std::vector<float> fifo(capacity * 2);
        size_t read = 0, write = 0, queued = 0;
        BYTE *initial{};
        check(out->GetBuffer(renderSize, &initial), "Prime output");
        check(out->ReleaseBuffer(renderSize, AUDCLNT_BUFFERFLAGS_SILENT), "Prime release");
        REFERENCE_TIME streamLatency{};
        check(render->GetStreamLatency(&streamLatency), "Stream latency");
        latency_ =
            static_cast<double>(streamLatency) / 10000.0 + 1000.0 * renderSize / rf->nSamplesPerSec;
        DWORD taskIndex{};
        TaskScope task{AvSetMmThreadCharacteristicsW(L"Pro Audio", &taskIndex)};
        ClientStop stops{capture.Get(), render.Get()};
        check(render->Start(), "Render start");
        check(capture->Start(), "Capture start");
        running_ = true;
        HANDLE events[]{captureEvent.h, renderEvent.h};
        while (!token.stop_requested()) {
            DWORD event = WaitForMultipleObjects(2, events, FALSE, 50);
            if (event == WAIT_FAILED)
                throw std::runtime_error("Audio event wait failed");
            if (event == WAIT_TIMEOUT)
                continue;
            const auto begin = std::chrono::steady_clock::now();
            UINT32 packet{};
            check(in->GetNextPacketSize(&packet), "Packet size");
            while (packet) {
                BYTE *data{};
                UINT32 frames{};
                DWORD flags{};
                check(in->GetBuffer(&data, &frames, &flags, nullptr, nullptr), "Capture buffer");
                if (flags & AUDCLNT_BUFFERFLAGS_DATA_DISCONTINUITY)
                    ++glitches_;
                if (frames > block) {
                    ++overruns_;
                    check(in->ReleaseBuffer(frames), "Oversize capture release");
                } else {
                    auto view = buffer.view(frames);
                    if (flags & AUDCLNT_BUFFERFLAGS_SILENT)
                        std::fill(view.samples.begin(), view.samples.end(), 0);
                    else
                        std::memcpy(view.samples.data(), data, frames * 2 * sizeof(float));
                    check(in->ReleaseBuffer(frames), "Capture release");
                    chain_.process(view);
                    if (queued + frames > capacity) {
                        ++overruns_;
                        read = write;
                        queued = 0;
                    }
                    for (UINT32 f = 0; f < frames; ++f) {
                        fifo[write * 2] = view.at(f, 0);
                        fifo[write * 2 + 1] = view.at(f, 1);
                        write = (write + 1) % capacity;
                    }
                    queued += frames;
                }
                check(in->GetNextPacketSize(&packet), "Next packet");
            }
            UINT32 padding{};
            check(render->GetCurrentPadding(&padding), "Render padding");
            UINT32 available = renderSize - padding;
            if (available) {
                BYTE *dst{};
                check(out->GetBuffer(available, &dst), "Render buffer");
                auto *samples = reinterpret_cast<float *>(dst);
                if (queued < available)
                    ++underruns_;
                for (UINT32 f = 0; f < available; ++f) {
                    if (queued) {
                        samples[f * 2] = fifo[read * 2];
                        samples[f * 2 + 1] = fifo[read * 2 + 1];
                        read = (read + 1) % capacity;
                        --queued;
                    } else {
                        samples[f * 2] = samples[f * 2 + 1] = 0;
                    }
                }
                check(out->ReleaseBuffer(available, 0), "Render release");
            }
            callbackMs_ =
                std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - begin)
                    .count();
        }
    } catch (const std::exception &error) {
        std::lock_guard lock(errorMutex_);
        error_ = error.what();
    }
    running_ = false;
    accepting_ = false;
}
} // namespace miyazato::windows
