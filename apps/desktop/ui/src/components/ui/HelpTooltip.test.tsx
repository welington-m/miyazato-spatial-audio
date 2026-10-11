import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import HelpTooltip, { placeHelp } from "./HelpTooltip";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
describe("contextual help", () => {
  it("opens after 300 ms hover, associates content and closes on leave", () => {
    vi.useFakeTimers();
    render(<HelpTooltip help="bass" />);
    const button = screen.getByRole("button", { name: "Help: Bass" });
    fireEvent.mouseEnter(button);
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole("tooltip")).toHaveTextContent("low-shelf filter");
    expect(button).toHaveAttribute(
      "aria-describedby",
      screen.getByRole("tooltip").id,
    );
    expect(screen.getByText("Best for")).toBeInTheDocument();
    expect(screen.getByText("Note")).toBeInTheDocument();
    fireEvent.mouseLeave(button);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
  it("pins hover content on click, survives leave and closes on outside tap", () => {
    vi.useFakeTimers();
    render(<HelpTooltip help="bass" />);
    const button = screen.getByRole("button");
    fireEvent.mouseEnter(button);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.click(button);
    fireEvent.mouseLeave(button);
    expect(screen.getByRole("dialog", { name: "Bass" })).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-expanded", "true");
    fireEvent.pointerDown(screen.getByRole("dialog"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.pointerDown(document.body, { pointerType: "touch" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("uses a keyboard-focusable native button and Escape dismisses", () => {
    render(<HelpTooltip help="hrtf" />);
    const button = screen.getByRole("button", { name: "Help: HRTF" });
    button.focus();
    expect(button).toHaveFocus();
    expect(button).not.toHaveAttribute("tabindex", "-1");
    fireEvent.keyDown(button, { key: "Enter" });
    expect(screen.getByRole("dialog")).toHaveTextContent("Planned feature");
    fireEvent.keyDown(button, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(button).toHaveFocus();
    fireEvent.keyDown(button, { key: " " });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(button, { key: " " });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("cancels pending hover on leave and unmount", () => {
    vi.useFakeTimers();
    const view = render(<HelpTooltip help="bass" />);
    fireEvent.mouseEnter(screen.getByRole("button"));
    fireEvent.mouseLeave(screen.getByRole("button"));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByRole("button"));
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("supports future learn-more links in pinned help", () => {
    render(
      <HelpTooltip
        entry={{
          title: "Example",
          description: "Details",
          learnMore: { href: "#help", label: "Learn more" },
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("link", { name: "Learn more" })).toHaveAttribute(
      "href",
      "#help",
    );
  });
});
describe("viewport placement", () => {
  for (const [width, height] of [
    [1366, 768],
    [1920, 1080],
    [2560, 1440],
    [3840, 2160],
    [320, 480],
  ]) {
    it(`keeps help inside ${width}×${height} and flips at the bottom`, () => {
      const panelWidth = Math.min(310, width - 24),
        panelHeight = 270;
      const anchor = {
        left: width - 30,
        top: height - 40,
        bottom: height - 18,
      } as DOMRect;
      const position = placeHelp(
        anchor,
        panelWidth,
        panelHeight,
        width,
        height,
      );
      expect(position.left).toBeGreaterThanOrEqual(12);
      expect(position.left + panelWidth).toBeLessThanOrEqual(width - 12);
      expect(position.top).toBeGreaterThanOrEqual(12);
      expect(position.top + panelHeight).toBeLessThan(anchor.top);
      const top = placeHelp(
        { left: 0, top: 0, bottom: 22 } as DOMRect,
        panelWidth,
        panelHeight,
        width,
        height,
      );
      expect(top.top).toBe(30);
    });
  }
});
