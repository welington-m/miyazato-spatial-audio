import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import App from "./App";
import {
  preset,
  parseSettings,
  initialSettings,
  isProfile,
  variants,
  modes,
} from "./profile";
afterEach(() => {
  cleanup();
  localStorage.clear();
});
describe("profiles", () => {
  it("validates every shipped preset", () => {
    for (const mode of modes)
      for (const variant of variants[mode])
        expect(isProfile(preset(mode, variant))).toBe(true);
  });
  it("recovers malformed persisted state", () => {
    expect(parseSettings({ version: 1, profile: { eq: [] } })).toEqual(
      initialSettings,
    );
  });
  it("rejects non-finite coefficients and excessive gains", () => {
    const p = preset("Music");
    p.eq[0].gainDb = 100;
    expect(isProfile(p)).toBe(false);
    p.eq[0].gainDb = 0;
    p.ratio = NaN;
    expect(isProfile(p)).toBe(false);
  });
});
describe("desktop UI", () => {
  it("switches modes and exposes genuine DSP controls", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /FPS Focus/ }));
    expect(screen.getByText("FPS Competitive")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Bass" })).toHaveValue("0");
  });
  it("supports keyboard-accessible bypass and EQ navigation", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "BYPASS" }));
    expect(screen.getByRole("button", { name: "BYPASS" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Equalizer" }));
    expect(screen.getByLabelText("Band frequency")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("slider", { name: "Band 1 gain" }), {
      key: "ArrowUp",
    });
    expect(screen.getByRole("slider", { name: "Band 1 gain" })).toHaveAttribute(
      "aria-valuenow",
      "1.5",
    );
  });
  it("does not claim native device support in browser preview", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Output Device" }));
    expect(
      screen.getByRole("button", { name: "Start prototype route" }),
    ).toBeDisabled();
    expect(
      screen.getByText(/Device enumeration is available/),
    ).toBeInTheDocument();
  });
});

describe("profile comparisons and custom presets", () => {
  it("restores separate A and B settings", () => {
    render(<App />);
    fireEvent.change(screen.getByRole("slider", { name: "Bass" }), {
      target: { value: "71" },
    });
    fireEvent.click(screen.getByRole("button", { name: "B" }));
    expect(screen.getByRole("slider", { name: "Bass" })).toHaveValue("0");
    fireEvent.click(screen.getByRole("button", { name: "A" }));
    expect(screen.getByRole("slider", { name: "Bass" })).toHaveValue("71");
  });
  it("saves and recalls a custom preset", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Audio Profiles" }));
    fireEvent.change(screen.getByRole("slider", { name: "Bass" }), {
      target: { value: "62" },
    });
    fireEvent.change(screen.getByLabelText("Custom profile name"), {
      target: { value: "My headphones" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save current" }));
    fireEvent.click(screen.getByRole("button", { name: /FPS Focus/ }));
    fireEvent.click(screen.getByRole("button", { name: "My headphones" }));
    expect(screen.getByRole("slider", { name: "Bass" })).toHaveValue("62");
  });
});
