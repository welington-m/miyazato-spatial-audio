import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as bridge from "../../bridge";
import type { SpectrumFrame } from "../../bridge";
import { i18n, resources } from "../../i18n";
import SpectrumAnalyzer from "./SpectrumAnalyzer";
import { drawSpectrum, frequencyPosition, isSpectrumFrame } from "./spectrum";

const sampleFrame = (values: Partial<SpectrumFrame> = {}): SpectrumFrame => ({
  sequence: 1,
  timestamp: 10,
  fftSize: 2048,
  sampleRate: 48000,
  minFrequency: 20,
  maxFrequency: 20000,
  floorDb: -90,
  bins: Array(64).fill(-30),
  computeMs: 0.1,
  updatesPerSecond: 60,
  droppedBlocks: 0,
  droppedFrames: 0,
  ...values,
});
let receive: (event: bridge.HostEvent) => void;
let frames: Map<number, FrameRequestCallback>;
let context: CanvasRenderingContext2D;
function drawAt(time: number) {
  const pending = [...frames.values()];
  frames.clear();
  act(() => {
    for (const draw of pending) draw(time);
  });
}
beforeEach(() => {
  void i18n.changeLanguage("en");
  frames = new Map();
  let next = 0;
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => {
      frames.set(++next, callback);
      return next;
    }),
  );
  vi.stubGlobal(
    "cancelAnimationFrame",
    vi.fn((id: number) => frames.delete(id)),
  );
  vi.spyOn(performance, "now").mockReturnValue(0);
  context = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: "",
  } as unknown as CanvasRenderingContext2D;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
  vi.spyOn(bridge, "subscribe").mockImplementation((callback) => {
    receive = callback;
    return vi.fn();
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  void i18n.changeLanguage("en");
});
function deliver(frame = sampleFrame()) {
  act(() => receive({ type: "spectrum", ...frame }));
}

describe("native spectrum presentation", () => {
  it("mounts a truthful static fallback without claiming live or running animation in browser preview", () => {
    render(<SpectrumAnalyzer running={false} nativeAvailable={false} />);
    expect(screen.getByRole("status")).toHaveTextContent("ILLUSTRATIVE");
    expect(
      screen.getByRole("img", { name: "Static mock spectrum" }),
    ).toBeInTheDocument();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });
  it("keeps the initial native paused preview explicitly illustrative until first measured data", () => {
    render(<SpectrumAnalyzer running={false} nativeAvailable />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "ILLUSTRATIVE · analyzer paused",
    );
    expect(
      screen.getByRole("img", { name: "Static mock spectrum" }),
    ).toBeInTheDocument();
  });
  it("only switches to live after receiving validated native data and draws it on canvas", () => {
    render(<SpectrumAnalyzer running nativeAvailable />);
    expect(screen.getByRole("status")).toHaveTextContent("awaiting live FFT");
    deliver();
    expect(screen.getByRole("status")).toHaveTextContent("LIVE · FFT 2048");
    expect(
      screen.queryByRole("img", { name: "Static mock spectrum" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Live frequency spectrum" }).tagName,
    ).toBe("CANVAS");
    drawAt(17);
    expect(context.fillRect).toHaveBeenCalledTimes(64);
  });
  it("draws silence at the floor with no fabricated movement", () => {
    render(<SpectrumAnalyzer running nativeAvailable />);
    deliver(sampleFrame({ bins: Array(64).fill(-90) }));
    drawAt(17);
    drawAt(34);
    expect(context.clearRect).toHaveBeenCalled();
    expect(context.fillRect).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("LIVE");
  });
  it("expires stale frames and handles unavailable, paused and restarted analysis", () => {
    const view = render(<SpectrumAnalyzer running nativeAvailable />);
    deliver();
    drawAt(17);
    drawAt(1100);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Analyzer unavailable",
    );
    deliver();
    expect(screen.getByRole("status")).toHaveTextContent("LIVE");
    act(() =>
      receive({ type: "spectrum.status", available: false, paused: false }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Analyzer unavailable",
    );
    view.rerender(<SpectrumAnalyzer running={false} nativeAvailable />);
    expect(screen.getByRole("status")).toHaveTextContent("Analyzer paused");
    deliver();
    expect(screen.getByRole("status")).not.toHaveTextContent("LIVE");
    view.rerender(<SpectrumAnalyzer running nativeAvailable />);
    expect(screen.getByRole("status")).toHaveTextContent("Awaiting live FFT");
    expect(
      screen.queryByRole("img", { name: "Static mock spectrum" }),
    ).not.toBeInTheDocument();
    deliver();
    expect(screen.getByRole("status")).toHaveTextContent("LIVE");
  });
  it("updates FFT format and logarithmic axis when sample rate changes", () => {
    render(<SpectrumAnalyzer running nativeAvailable />);
    deliver(
      sampleFrame({ fftSize: 4096, sampleRate: 8000, maxFrequency: 4000 }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("LIVE · FFT 4096");
    expect(screen.getByText("4k Hz")).toBeInTheDocument();
    expect(screen.queryByText("20k Hz")).not.toBeInTheDocument();
    expect(screen.getByText("100")).toHaveStyle({
      left: `${frequencyPosition(100, 20, 4000) * 100}%`,
    });
  });
  it("localizes status, accessibility and help without losing the live frame", async () => {
    render(<SpectrumAnalyzer running nativeAvailable />);
    deliver();
    fireEvent.click(screen.getByRole("button", { name: "Help: FFT" }));
    for (const language of ["pt-BR", "es", "ja", "en"] as const) {
      await act(async () => {
        await i18n.changeLanguage(language);
      });
      const text = resources[language];
      expect(screen.getByRole("status")).toHaveTextContent(
        text["spectrum.status.live"].replace("{{fftSize}}", "2048"),
      );
      expect(
        screen.getByRole("img", { name: text["spectrum.liveAria"] }),
      ).toBeInTheDocument();
      expect(screen.getByRole("dialog")).toHaveTextContent(
        text["help.fft.description"],
      );
    }
  });
  it("contains canvas failure and cleans up animation on unmount", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const view = render(<SpectrumAnalyzer running nativeAvailable />);
    deliver();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Analyzer unavailable",
    );
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    view.unmount();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context,
    );
    const live = render(<SpectrumAnalyzer running nativeAvailable />);
    deliver();
    live.unmount();
    expect(frames.size).toBe(0);
  });
  it("rejects corrupt IPC frames instead of claiming live", () => {
    render(<SpectrumAnalyzer running nativeAvailable />);
    for (const bad of [
      sampleFrame({ bins: [NaN] }),
      sampleFrame({ sampleRate: 0 }),
      sampleFrame({ bins: Array(64).fill(Infinity) }),
    ])
      deliver(bad);
    expect(screen.getByRole("status")).not.toHaveTextContent("LIVE");
  });
});
describe("spectrum data and drawing", () => {
  it("requires 64 finite, bounded bins and valid FFT metadata", () => {
    expect(isSpectrumFrame(sampleFrame())).toBe(true);
    for (const input of [
      null,
      {},
      sampleFrame({ fftSize: 3 }),
      sampleFrame({ bins: Array(64).fill(1) }),
      sampleFrame({ maxFrequency: 48000 }),
      sampleFrame({ floorDb: 0 }),
    ])
      expect(isSpectrumFrame(input)).toBe(false);
  });
  it("draws independent bar heights and evenly spaced logarithmic bands", () => {
    const bins = Array(64).fill(-90);
    bins[0] = 0;
    bins[10] = -45;
    drawSpectrum(context, bins, -90, 640, 100, "#97eb00");
    expect(context.fillRect).toHaveBeenNthCalledWith(1, 0, 0, 7, 100);
    expect(context.fillRect).toHaveBeenNthCalledWith(2, 100, 50, 7, 50);
    expect(frequencyPosition(20, 20, 20000)).toBe(0);
    expect(frequencyPosition(200, 20, 20000)).toBeCloseTo(1 / 3);
    expect(frequencyPosition(2000, 20, 20000)).toBeCloseTo(2 / 3);
    expect(frequencyPosition(20000, 20, 20000)).toBe(1);
  });
});
