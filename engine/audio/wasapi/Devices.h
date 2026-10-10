#pragma once
#include <mmdeviceapi.h>
#include <string>
#include <vector>
#include <windows.h>
#include <wrl/client.h>
namespace miyazato::windows {
struct Device {
    std::wstring id, name;
    unsigned channels{}, sampleRate{}, bits{};
    bool isDefault{}, floatFormat{};
};
std::vector<Device> enumerateOutputs();
std::string utf8(const std::wstring &value);
std::wstring wide(const std::string &value);
void check(HRESULT result, const char *operation);
} // namespace miyazato::windows
