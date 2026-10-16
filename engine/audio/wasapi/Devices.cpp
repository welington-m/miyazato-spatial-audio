#include "engine/audio/wasapi/Devices.h"
#include <audioclient.h>
#include <functiondiscoverykeys_devpkey.h>
#include <ks.h>
#include <ksmedia.h>
#include <stdexcept>
namespace miyazato::windows {
using Microsoft::WRL::ComPtr;
void check(HRESULT h, const char *op) {
    if (FAILED(h))
        throw std::runtime_error(std::string(op) +
                                 " HRESULT=" + std::to_string(static_cast<unsigned long>(h)));
}
std::string utf8(const std::wstring &v) {
    if (v.empty())
        return {};
    int n = WideCharToMultiByte(CP_UTF8, 0, v.data(), static_cast<int>(v.size()), nullptr, 0,
                                nullptr, nullptr);
    std::string s(n, 0);
    WideCharToMultiByte(CP_UTF8, 0, v.data(), static_cast<int>(v.size()), s.data(), n, nullptr,
                        nullptr);
    return s;
}
std::wstring wide(const std::string &v) {
    if (v.empty())
        return {};
    int n = MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, v.data(), static_cast<int>(v.size()),
                                nullptr, 0);
    std::wstring s(n, 0);
    MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, v.data(), static_cast<int>(v.size()),
                        s.data(), n);
    return s;
}
std::vector<Device> enumerateOutputs() { return enumerateDevices(eRender); }
std::vector<Device> enumerateDevices(EDataFlow flow) {
    ComPtr<IMMDeviceEnumerator> e;
    check(CoCreateInstance(__uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL, IID_PPV_ARGS(&e)),
          "Device enumerator");
    std::wstring defaultId;
    ComPtr<IMMDevice> def;
    if (SUCCEEDED(e->GetDefaultAudioEndpoint(flow, eConsole, &def))) {
        LPWSTR id{};
        if (SUCCEEDED(def->GetId(&id))) {
            defaultId = id;
            CoTaskMemFree(id);
        }
    }
    ComPtr<IMMDeviceCollection> list;
    check(e->EnumAudioEndpoints(flow, DEVICE_STATE_ACTIVE, &list), "Enumerate outputs");
    UINT count{};
    check(list->GetCount(&count), "Device count");
    std::vector<Device> devices;
    for (UINT i = 0; i < count; ++i) {
        ComPtr<IMMDevice> d;
        if (FAILED(list->Item(i, &d)))
            continue;
        LPWSTR id{};
        if (FAILED(d->GetId(&id)))
            continue;
        Device item;
        item.id = id;
        CoTaskMemFree(id);
        item.isDefault = item.id == defaultId;
        ComPtr<IPropertyStore> props;
        if (SUCCEEDED(d->OpenPropertyStore(STGM_READ, &props))) {
            PROPVARIANT name;
            PropVariantInit(&name);
            if (SUCCEEDED(props->GetValue(PKEY_Device_FriendlyName, &name)) && name.vt == VT_LPWSTR)
                item.name = name.pwszVal;
            PropVariantClear(&name);
        }
        ComPtr<IAudioClient> audio;
        if (SUCCEEDED(d->Activate(__uuidof(IAudioClient), CLSCTX_ALL, nullptr, &audio))) {
            WAVEFORMATEX *f{};
            if (SUCCEEDED(audio->GetMixFormat(&f))) {
                item.channels = f->nChannels;
                item.sampleRate = f->nSamplesPerSec;
                item.bits = f->wBitsPerSample;
                item.floatFormat =
                    f->wFormatTag == WAVE_FORMAT_IEEE_FLOAT ||
                    (f->wFormatTag == WAVE_FORMAT_EXTENSIBLE &&
                     IsEqualGUID(reinterpret_cast<WAVEFORMATEXTENSIBLE *>(f)->SubFormat,
                                 KSDATAFORMAT_SUBTYPE_IEEE_FLOAT));
                CoTaskMemFree(f);
            }
        }
        devices.push_back(std::move(item));
    }
    return devices;
}
} // namespace miyazato::windows
