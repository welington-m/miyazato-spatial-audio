#pragma once
#include <array>
#include <atomic>
#include <cstddef>
#include <type_traits>
namespace miyazato {
// Exactly one producer and one consumer. No allocation, waiting or overwrite.
template <class T, size_t Capacity> class SpscQueue {
    static_assert(Capacity > 1 && std::is_trivially_copyable_v<T>);
    std::array<T, Capacity> data_{};
    alignas(64) std::atomic<size_t> write_{};
    alignas(64) std::atomic<size_t> read_{};

  public:
    bool push(const T &value) noexcept {
        auto w = write_.load(std::memory_order_relaxed);
        auto next = (w + 1) % Capacity;
        if (next == read_.load(std::memory_order_acquire))
            return false;
        data_[w] = value;
        write_.store(next, std::memory_order_release);
        return true;
    }
    bool pop(T &value) noexcept {
        auto r = read_.load(std::memory_order_relaxed);
        if (r == write_.load(std::memory_order_acquire))
            return false;
        value = data_[r];
        read_.store((r + 1) % Capacity, std::memory_order_release);
        return true;
    }
};
} // namespace miyazato
