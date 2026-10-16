#include "engine/audio/wasapi/Devices.h"
#include "engine/audio/wasapi/LoopbackEngine.h"
#include "resource.h"
#include "engine/audio/wasapi/AnalyzerCapture.h"
#include <WebView2.h>
#include <chrono>
#include <filesystem>
#include <fstream>
#include <nlohmann/json.hpp>
#include <shlobj.h>
#include <windows.h>
#include <wrl.h>
#include <wrl/implements.h>
using Microsoft::WRL::Callback;
using Microsoft::WRL::ComPtr;
using json = nlohmann::json;
namespace {
ComPtr<ICoreWebView2Controller> controller;
ComPtr<ICoreWebView2> web;
miyazato::windows::LoopbackEngine engine;
miyazato::windows::AnalyzerCapture spectrumCapture;
bool spectrumPaused = true;
std::string spectrumSource = "output";
std::filesystem::path settingsPath;
bool closing = false;
std::string routeSource, routeOutput;
constexpr UINT deviceChangeMessage = WM_APP + 1;
class DeviceNotifications final
    : public Microsoft::WRL::RuntimeClass<
          Microsoft::WRL::RuntimeClassFlags<Microsoft::WRL::ClassicCom>, IMMNotificationClient> {
    HWND window_;
    void changed(bool lost = false) { PostMessageW(window_, deviceChangeMessage, lost ? 1 : 0, 0); }

  public:
    explicit DeviceNotifications(HWND hwnd) : window_(hwnd) {}
    HRESULT STDMETHODCALLTYPE OnDeviceStateChanged(LPCWSTR, DWORD state) override {
        changed(state != DEVICE_STATE_ACTIVE);
        return S_OK;
    }
    HRESULT STDMETHODCALLTYPE OnDeviceAdded(LPCWSTR) override {
        changed();
        return S_OK;
    }
    HRESULT STDMETHODCALLTYPE OnDeviceRemoved(LPCWSTR) override {
        changed(true);
        return S_OK;
    }
    HRESULT STDMETHODCALLTYPE OnDefaultDeviceChanged(EDataFlow flow, ERole, LPCWSTR) override {
        if (flow == eRender || flow == eCapture)
            changed();
        return S_OK;
    }
    HRESULT STDMETHODCALLTYPE OnPropertyValueChanged(LPCWSTR, const PROPERTYKEY) override {
        changed();
        return S_OK;
    }
};
ComPtr<IMMDeviceEnumerator> notificationsEnumerator;
ComPtr<DeviceNotifications> notifications;

void send(const json &j) {
    if (web) {
        auto text = miyazato::windows::wide(j.dump());
        web->PostWebMessageAsJson(text.c_str());
    }
}
json devices() {
    json rows = json::array();
    for (const auto &d : miyazato::windows::enumerateOutputs())
        rows.push_back({{"id", miyazato::windows::utf8(d.id)},
                        {"name", miyazato::windows::utf8(d.name)},
                        {"channels", d.channels},
                        {"sampleRate", d.sampleRate},
                        {"bits", d.bits},
                        {"isDefault", d.isDefault},
                        {"floatFormat", d.floatFormat}});
    return rows;
}
void sendAnalyzerDevices() {
    json rows = json::array();
    for (auto flow : {eRender, eCapture})
        for (const auto &d : miyazato::windows::enumerateDevices(flow))
            rows.push_back({{"id", miyazato::windows::utf8(d.id)},
                            {"name", miyazato::windows::utf8(d.name)},
                            {"source", flow == eRender ? "output" : "input"}});
    send({{"type", "analyzer.devices"}, {"devices", rows}});
}
void receive(const json &m) {
    const std::string type = m.at("type");
    auto request = m.value("requestId", std::string{});
    try {
        if (type == "analyzer.select") {
            spectrumSource = m.value("source", std::string("output"));
            if (spectrumSource != "output" && spectrumSource != "input")
                throw std::runtime_error("Invalid analyzer source");
            spectrumPaused = false;
            spectrumCapture.start(miyazato::windows::wide(m.value("endpointId", std::string{})),
                spectrumSource == "output" ? miyazato::windows::AnalyzerSource::OutputLoopback
                                           : miyazato::windows::AnalyzerSource::InputCapture);
        } else if (type == "analyzer.stop") {
            spectrumCapture.stop();
            spectrumPaused = true;
        } else if (type == "analyzer.devices") {
            sendAnalyzerDevices();
        } else if (type == "devices.list")
            send({{"type", "devices"}, {"devices", devices()}, {"requestId", request}});
        else if (type == "settings.load") {
            json value = nullptr;
            std::ifstream f(settingsPath);
            if (f) {
                try {
                    f >> value;
                } catch (const json::exception &) {
                    send(
                        {{"type", "error"}, {"message", "Invalid settings file; defaults loaded"}});
                    value = nullptr;
                }
            }
            send({{"type", "settings"}, {"value", value}});
        } else if (type == "settings.save") {
            auto temporary = settingsPath;
            temporary += L".tmp";
            {
                std::ofstream f(temporary, std::ios::trunc);
                if (!f)
                    throw std::runtime_error("Cannot save settings");
                f << m.at("value").dump(2);
                f.flush();
                if (!f)
                    throw std::runtime_error("Settings write failed");
            }
            if (!MoveFileExW(temporary.c_str(), settingsPath.c_str(),
                             MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH))
                throw std::runtime_error("Settings replacement failed");
        } else if (type == "engine.start") {
            const auto source = m.at("sourceId").get<std::string>();
            const auto output = m.at("outputId").get<std::string>();
            engine.start(miyazato::windows::wide(source), miyazato::windows::wide(output));
            routeSource = source;
            routeOutput = output;
        } else if (type == "engine.stop")
            engine.stop();
        else if (type == "profile.set") {
            auto p = miyazato::defaultProfile();
            const auto &v = m.at("profile");
            p.bass = v.value("bass", 0.0f);
            p.clarity = v.value("clarity", 0.0f);
            p.width = v.value("width", 100.0f);
            p.crossfeed = v.value("crossfeed", 0.0f);
            p.bypass = v.value("bypass", false);
            p.preampDb = v.value("preampDb", -6.0f);
            p.outputDb = v.value("outputDb", 0.0f);
            p.compressorEnabled = v.value("compressorEnabled", false);
            p.thresholdDb = v.value("thresholdDb", -18.0f);
            p.ratio = v.value("ratio", 2.0f);
            p.attackMs = v.value("attackMs", 10.0f);
            p.releaseMs = v.value("releaseMs", 120.0f);
            p.makeupDb = v.value("makeupDb", 0.0f);
            if (v.contains("eq")) {
                const auto &bands = v.at("eq");
                if (bands.size() != 10)
                    throw std::runtime_error("Expected ten EQ bands");
                for (size_t i = 0; i < 10; ++i) {
                    p.eq[i].frequency = bands[i].at("frequency");
                    p.eq[i].gainDb = bands[i].at("gainDb");
                    p.eq[i].q = bands[i].value("q", 0.707f);
                    p.eq[i].enabled = bands[i].value("enabled", true);
                    const auto t = bands[i].value("type", 0);
                    if (t < 0 || t > 4)
                        throw std::runtime_error("Invalid EQ filter type");
                    p.eq[i].type = static_cast<miyazato::FilterType>(t);
                }
            }
            if (!miyazato::validProfile(p))
                throw std::runtime_error("Invalid profile parameter range");
            if (!engine.configure(p))
                throw std::runtime_error("Parameter queue full; retry the change");
        } else
            throw std::runtime_error("Unknown message type");
    } catch (const std::exception &e) {
        send({{"type", "error"}, {"message", e.what()}, {"requestId", request}});
    }
}
LRESULT CALLBACK windowProc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp) {
    switch (msg) {
    case deviceChangeMessage:
        spectrumCapture.notifyDeviceChange();
        try { sendAnalyzerDevices(); } catch (...) { /* Optional analyzer list refresh. */ }
        if (wp)
            engine.stop();
        try {
            send({{"type", "devices"}, {"devices", devices()}});
        } catch (const std::exception &e) {
            send({{"type", "error"}, {"message", e.what()}});
        }
        return 0;
    case WM_SIZE:
        if (controller) {
            RECT r;
            GetClientRect(hwnd, &r);
            controller->put_Bounds(r);
        }
        return 0;
    case WM_TIMER: {
        auto s = engine.status();
        send({{"type", "status"},
              {"sourceId", routeSource},
              {"outputId", routeOutput},
              {"running", s.running},
              {"underruns", s.underruns},
              {"overruns", s.overruns},
              {"glitches", s.glitches},
              {"bufferMs", s.bufferMs},
              {"callbackMs", s.callbackMs},
              {"error", s.error}});
        miyazato::AnalyzerSnapshot a, last;
        bool found = false;
        while (engine.snapshot(a)) {
            last = a;
            found = true;
        }
        if (found)
            send({{"type", "analyzer"},
                  {"peakL", last.peakL},
                  {"peakR", last.peakR},
                  {"rmsL", last.rmsL},
                  {"rmsR", last.rmsR},
                  {"reductionDb", last.reductionDb},
                  {"waveform", last.waveform}});
        // Optional analyzer telemetry uses the existing UI timer, never the audio callback.
        // Serialization/bridge failure is contained without stopping the audio route.
        try {
            miyazato::SpectrumFrame frame, latest;
            bool hasSpectrum = false;
            while (spectrumCapture.snapshot(frame)) {
                latest = frame;
                hasSpectrum = true;
            }
            const auto now =
                static_cast<uint64_t>(std::chrono::duration_cast<std::chrono::milliseconds>(
                                          std::chrono::steady_clock::now().time_since_epoch())
                                          .count());
            if (spectrumCapture.available() && hasSpectrum && latest.timestamp <= now &&
                now - latest.timestamp <= 1000)
                send({{"type", "spectrum"},
                      {"source", spectrumSource},
                      {"sequence", latest.sequence},
                      {"timestamp", latest.timestamp},
                      {"fftSize", latest.fftSize},
                      {"sampleRate", latest.sampleRate},
                      {"minFrequency", latest.minFrequency},
                      {"maxFrequency", latest.maxFrequency},
                      {"floorDb", latest.floorDb},
                      {"bins", latest.bins},
                      {"computeMs", latest.computeMs},
                      {"updatesPerSecond", latest.updatesPerSecond},
                      {"droppedBlocks", latest.droppedBlocks},
                      {"droppedFrames", latest.droppedFrames}});
            // Fixed timer cadence bounds diagnostics; no JSON or UI work on acquisition.
            static uint64_t lastDiagnostics = 0;
            static auto lastAnalyzerState = miyazato::windows::AnalyzerState::Stopped;
            const auto analyzerState = spectrumCapture.state();
            if (analyzerState != lastAnalyzerState || now - lastDiagnostics >= 1000) {
                lastDiagnostics = now;
                lastAnalyzerState = analyzerState;
                send({{"type", "spectrum.status"}, {"available", spectrumCapture.available()},
                      {"paused", spectrumPaused}, {"source", spectrumSource},
                      {"status", miyazato::windows::analyzerStateName(spectrumCapture.state())},
                      {"sampleRate", spectrumCapture.sampleRate()}, {"channels", spectrumCapture.channels()},
                      {"acquisitionCpuMs", spectrumCapture.acquisitionCpuMs()}});
            }
        } catch (...) {
            // UI expires stale frames; analyzer delivery is strictly best-effort.
        }
        return 0;
    }
    case WM_CLOSE:
        spectrumCapture.stop();
        closing = true;
        if (notificationsEnumerator && notifications)
            notificationsEnumerator->UnregisterEndpointNotificationCallback(notifications.Get());
        notifications.Reset();
        notificationsEnumerator.Reset();
        KillTimer(hwnd, 1);
        engine.stop();
        if (controller)
            controller->Close();
        web.Reset();
        controller.Reset();
        DestroyWindow(hwnd);
        return 0;
    case WM_DESTROY:
        PostQuitMessage(0);
        return 0;
    }
    return DefWindowProcW(hwnd, msg, wp, lp);
}
} // namespace
int WINAPI wWinMain(HINSTANCE instance, HINSTANCE, LPWSTR, int show) {
    HRESULT com = CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);
    if (FAILED(com))
        return 1;
    try {
        PWSTR roaming{};
        miyazato::windows::check(
            SHGetKnownFolderPath(FOLDERID_RoamingAppData, 0, nullptr, &roaming), "AppData");
        std::filesystem::path data = roaming;
        CoTaskMemFree(roaming);
        data /= L"MiyazatoSpatialEngine";
        std::filesystem::create_directories(data);
        settingsPath = data / L"settings.json";
        WNDCLASSEXW wc{};
        wc.cbSize = sizeof(wc);
        wc.hIcon = LoadIconW(instance, MAKEINTRESOURCEW(IDI_MSE_APP));
        wc.hIconSm = static_cast<HICON>(LoadImageW(instance, MAKEINTRESOURCEW(IDI_MSE_APP),
                                                   IMAGE_ICON, GetSystemMetrics(SM_CXSMICON),
                                                   GetSystemMetrics(SM_CYSMICON), LR_SHARED));
        wc.lpfnWndProc = windowProc;
        wc.hInstance = instance;
        wc.lpszClassName = L"MiyazatoSpatialEngine";
        wc.hCursor = LoadCursor(nullptr, IDC_ARROW);
        RegisterClassExW(&wc);
        HWND hwnd = CreateWindowExW(0, wc.lpszClassName, L"Miyazato Spatial Engine",
                                    WS_OVERLAPPEDWINDOW, CW_USEDEFAULT, CW_USEDEFAULT, 1440, 940,
                                    nullptr, nullptr, instance, nullptr);
        if (!hwnd)
            throw std::runtime_error("Window creation failed");
        ShowWindow(hwnd, show);
        miyazato::windows::check(CoCreateInstance(__uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL,
                                                  IID_PPV_ARGS(&notificationsEnumerator)),
                                 "Notifications enumerator");
        notifications = Microsoft::WRL::Make<DeviceNotifications>(hwnd);
        miyazato::windows::check(
            notificationsEnumerator->RegisterEndpointNotificationCallback(notifications.Get()),
            "Device notifications");
        wchar_t exe[MAX_PATH];
        GetModuleFileNameW(nullptr, exe, MAX_PATH);
        auto ui = std::filesystem::path(exe).parent_path() / L"ui";
        if (!std::filesystem::exists(ui / L"index.html"))
            throw std::runtime_error("Build UI first: missing ui/index.html");
        auto cache = data / L"WebView2";
        HRESULT init = CreateCoreWebView2EnvironmentWithOptions(
            nullptr, cache.c_str(), nullptr,
            Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler>(
                [hwnd, ui](HRESULT hr, ICoreWebView2Environment *env) -> HRESULT {
                    if (closing)
                        return S_OK;
                    if (FAILED(hr)) {
                        MessageBoxW(hwnd, L"Install Microsoft Edge WebView2 Runtime",
                                    L"WebView2 initialization failed", MB_ICONERROR);
                        PostMessageW(hwnd, WM_CLOSE, 0, 0);
                        return hr;
                    }
                    return env->CreateCoreWebView2Controller(
                        hwnd,
                        Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>(
                            [hwnd, ui](HRESULT result, ICoreWebView2Controller *value) -> HRESULT {
                                if (closing)
                                    return S_OK;
                                if (FAILED(result)) {
                                    PostMessageW(hwnd, WM_CLOSE, 0, 0);
                                    return result;
                                }
                                controller = value;
                                controller->get_CoreWebView2(&web);
                                RECT r;
                                GetClientRect(hwnd, &r);
                                controller->put_Bounds(r);
                                ComPtr<ICoreWebView2_3> mapping;
                                if (FAILED(web.As(&mapping))) {
                                    MessageBoxW(hwnd, L"Update WebView2 Runtime",
                                                L"Required WebView2 API unavailable", MB_ICONERROR);
                                    PostMessageW(hwnd, WM_CLOSE, 0, 0);
                                    return E_NOINTERFACE;
                                }
                                HRESULT mapped = mapping->SetVirtualHostNameToFolderMapping(
                                    L"miyazato.local", ui.c_str(),
                                    COREWEBVIEW2_HOST_RESOURCE_ACCESS_KIND_DENY_CORS);
                                if (FAILED(mapped)) {
                                    PostMessageW(hwnd, WM_CLOSE, 0, 0);
                                    return mapped;
                                }
                                EventRegistrationToken navigationToken{};
                                web->add_NavigationStarting(
                                    Callback<ICoreWebView2NavigationStartingEventHandler>(
                                        [](ICoreWebView2 *,
                                           ICoreWebView2NavigationStartingEventArgs *args)
                                            -> HRESULT {
                                            LPWSTR raw{};
                                            args->get_Uri(&raw);
                                            std::wstring uri = raw ? raw : L"";
                                            CoTaskMemFree(raw);
                                            if (uri != L"https://miyazato.local/index.html" &&
                                                uri != L"https://miyazato.local/")
                                                args->put_Cancel(TRUE);
                                            return S_OK;
                                        })
                                        .Get(),
                                    &navigationToken);
                                EventRegistrationToken popupToken{};
                                web->add_NewWindowRequested(
                                    Callback<ICoreWebView2NewWindowRequestedEventHandler>(
                                        [](ICoreWebView2 *,
                                           ICoreWebView2NewWindowRequestedEventArgs *args)
                                            -> HRESULT {
                                            args->put_Handled(TRUE);
                                            return S_OK;
                                        })
                                        .Get(),
                                    &popupToken);
                                EventRegistrationToken token{};
                                web->add_WebMessageReceived(
                                    Callback<ICoreWebView2WebMessageReceivedEventHandler>(
                                        [](ICoreWebView2 *,
                                           ICoreWebView2WebMessageReceivedEventArgs *args)
                                            -> HRESULT {
                                            LPWSTR source{};
                                            args->get_Source(&source);
                                            std::wstring origin = source ? source : L"";
                                            CoTaskMemFree(source);
                                            if (origin != L"https://miyazato.local/" &&
                                                origin != L"https://miyazato.local/index.html")
                                                return S_OK;
                                            LPWSTR raw{};
                                            if (SUCCEEDED(args->get_WebMessageAsJson(&raw))) {
                                                auto text = miyazato::windows::utf8(raw);
                                                CoTaskMemFree(raw);
                                                try {
                                                    receive(json::parse(text));
                                                } catch (const std::exception &e) {
                                                    send(
                                                        {{"type", "error"}, {"message", e.what()}});
                                                }
                                            }
                                            return S_OK;
                                        })
                                        .Get(),
                                    &token);
                                web->Navigate(L"https://miyazato.local/index.html");
                                SetTimer(hwnd, 1, 33, nullptr);
                                return S_OK;
                            })
                            .Get());
                })
                .Get());
        miyazato::windows::check(init, "WebView2 environment");
        MSG message;
        while (GetMessageW(&message, nullptr, 0, 0) > 0) {
            TranslateMessage(&message);
            DispatchMessageW(&message);
        }
    } catch (const std::exception &e) {
        MessageBoxW(nullptr, miyazato::windows::wide(e.what()).c_str(), L"Miyazato startup error",
                    MB_ICONERROR);
        engine.stop();
        if (notificationsEnumerator && notifications)
            notificationsEnumerator->UnregisterEndpointNotificationCallback(notifications.Get());
        notifications.Reset();
        notificationsEnumerator.Reset();
        if (controller)
            controller->Close();
        web.Reset();
        controller.Reset();
        CoUninitialize();
        return 1;
    }
    CoUninitialize();
    return 0;
}
