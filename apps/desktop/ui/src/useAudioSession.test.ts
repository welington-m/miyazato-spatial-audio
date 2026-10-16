import { StrictMode } from "react";
import { it, expect, vi, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import * as bridge from "./bridge";
import { useAudioSession } from "./useAudioSession";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});
it("delivers profile changes during continuous slider interaction", () => {
  vi.useFakeTimers();
  const post = vi.spyOn(bridge, "post").mockImplementation(() => {});
  const { result } = renderHook(() => useAudioSession(), {
    wrapper: StrictMode,
  });
  for (let value = 30; value < 35; value++)
    act(() => {
      result.current.patch({ bass: value });
      vi.advanceTimersByTime(10);
    });
  expect(
    post.mock.calls.some(
      ([type, payload]) =>
        type === "profile.set" &&
        (payload?.profile as { bass: number }).bass < 34,
    ),
  ).toBe(true);
  act(() => vi.advanceTimersByTime(30));
  const updates = post.mock.calls.filter(([type]) => type === "profile.set");
  expect((updates.at(-1)?.[1]?.profile as { bass: number }).bass).toBe(34);
});
