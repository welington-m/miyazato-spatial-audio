#pragma once
namespace miyazato::windows {
enum class AnalyzerState { Stopped, Starting, Running, Recovering, Unavailable, Stopping };
constexpr const char *analyzerStateName(AnalyzerState state) noexcept {
    switch (state) {
    case AnalyzerState::Starting: return "starting";
    case AnalyzerState::Running: return "running";
    case AnalyzerState::Recovering: return "recovering";
    case AnalyzerState::Unavailable: return "unavailable";
    case AnalyzerState::Stopping: return "stopping";
    default: return "stopped";
    }
}
constexpr AnalyzerState analyzerFailureState(AnalyzerState state) noexcept {
    if (state == AnalyzerState::Stopping) return state;
    return state == AnalyzerState::Running ? AnalyzerState::Recovering : AnalyzerState::Unavailable;
}
// An explicit endpoint remains pinned across retries; only an empty ID follows default.
constexpr bool analyzerEndpointChanged(bool followsDefault, bool sameEndpoint, bool active) noexcept {
    return !active || (followsDefault && !sameEndpoint);
}
}
