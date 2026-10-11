import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "./App";
import * as bridge from "./bridge";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
it("covers real and planned controls across every audio screen without changing the profile or posting to native", () => {
  const post = vi.spyOn(bridge, "post");
  render(<App />);
  const verify = (title: string, content: RegExp) => {
    const saved = JSON.stringify(localStorage);
    post.mockClear();
    fireEvent.click(
      screen.getAllByRole("button", { name: `Help: ${title}` })[0],
    );
    expect(screen.getByRole("dialog", { name: title })).toHaveTextContent(
      content,
    );
    expect(post).not.toHaveBeenCalled();
    expect(JSON.stringify(localStorage)).toBe(saved);
    fireEvent.keyDown(document, { key: "Escape" });
  };
  verify("Stereo Width", /100% preserves width/);
  verify("Bass", /low-shelf/);
  verify("Clarity", /2.4 kHz/);
  verify("Spatial / Immersion", /currently bypassed/);
  verify("Music", /Hi-Fi/);
  verify("Bypass", /−6 dB/);
  verify("Buffer", /Not an adjustable buffer/);
  verify("Callback time", /latest audio event/);
  verify("Glitches", /data discontinuities/);
  verify("Underruns", /silence/);
  verify("Channels", /two channels/);
  fireEvent.click(screen.getByRole("button", { name: "Equalizer" }));
  for (const title of [
    "Frequency",
    "Gain",
    "Q",
    "Filter type",
    "Low Shelf",
    "High Shelf",
    "Bell / Peak",
    "Low Pass",
    "High Pass",
    "EQ band enabled",
  ])
    verify(title, /.+/);
  fireEvent.click(screen.getByRole("button", { name: "Spatial Audio" }));
  verify("Crossfeed", /Directly blends/);
  for (const title of [
    "HRTF",
    "Virtual Surround",
    "Upmix",
    "Spatial Intensity",
    "Room Size",
    "Front Distance",
    "Rear Presence",
    "Height Presence",
    "Center Focus",
  ])
    verify(title, /Planned feature/);
  fireEvent.click(screen.getByRole("button", { name: "Advanced" }));
  for (const title of [
    "Compressor",
    "Threshold",
    "Ratio",
    "Attack",
    "Release",
    "Makeup Gain",
    "Input Gain / Headroom",
    "Output Gain",
    "Limiter",
  ])
    verify(title, /.+/);
  fireEvent.click(screen.getByRole("button", { name: "Output Device" }));
  verify("Capture source", /loopback/);
  verify("Output device", /does not restart/);
  verify("Sample Rate", /matching stereo float32/);
});
