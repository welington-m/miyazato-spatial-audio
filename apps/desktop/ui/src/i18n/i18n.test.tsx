import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import App from "../App";
import HelpTooltip from "../components/ui/HelpTooltip";
import {
  detectLanguage,
  i18n,
  languageStorageKey,
  loadLanguage,
  resources,
  setLanguage,
  useI18n,
} from "./index";
import { locales, languageNames } from "./types";
import { preset } from "../profile";
import { profileName } from "./labels";
import * as bridge from "../bridge";

beforeEach(() => {
  localStorage.clear();
  void i18n.changeLanguage("en");
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
  void i18n.changeLanguage("en");
});

describe("locale resources", () => {
  it("has identical, nonempty keys and matching interpolation fields in all four languages", () => {
    const keys = Object.keys(resources.en).sort();
    const placeholders = (text: string) =>
      [...text.matchAll(/{{(\w+)}}/g)].map((match) => match[1]).sort();
    for (const locale of locales) {
      expect(Object.keys(resources[locale]).sort()).toEqual(keys);
      for (const key of keys as (keyof typeof resources.en)[]) {
        expect(resources[locale][key].trim(), `${locale}: ${key}`).not.toBe("");
        expect(
          placeholders(resources[locale][key]),
          `${locale}: ${key}`,
        ).toEqual(placeholders(resources.en[key]));
      }
    }
  });
  it("maps regional browser languages and falls back to English", () => {
    for (const [system, expected] of [
      ["pt-PT", "pt-BR"],
      ["pt-BR", "pt-BR"],
      ["es-MX", "es"],
      ["ja-JP", "ja"],
      ["en-GB", "en"],
      ["fr-FR", "en"],
    ])
      expect(detectLanguage([system])).toBe(expected);
    expect(detectLanguage([])).toBe("en");
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["fr-FR"]);
    expect(loadLanguage()).toBe("en");
  });
  it("restores the persisted preference before browser detection", async () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["ja-JP"]);
    expect(loadLanguage()).toBe("ja");
    await setLanguage("es");
    expect(JSON.parse(localStorage.getItem(languageStorageKey)!)).toEqual({
      language: "es",
    });
    await i18n.changeLanguage("en");
    await i18n.changeLanguage(loadLanguage());
    expect(i18n.resolvedLanguage).toBe("es");
    expect(document.documentElement.lang).toBe("es");
  });
  it("survives malformed, unsupported or inaccessible preferences and failed detection", async () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["pt-AO"]);
    for (const saved of ["{bad json", '{"language":"fr"}', "null", '"es"']) {
      localStorage.setItem(languageStorageKey, saved);
      expect(loadLanguage()).toBe("pt-BR");
    }
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadLanguage()).toBe("pt-BR");
    vi.spyOn(navigator, "languages", "get").mockImplementation(() => {
      throw new Error("detection failed");
    });
    expect(loadLanguage()).toBe("en");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    await setLanguage("ja");
    expect(i18n.resolvedLanguage).toBe("ja");
  });
  it("falls back to English if a translated key is missing", async () => {
    const key = "home.title";
    const bundle = i18n.getResourceBundle("es", "translation") as Record<
      string,
      string
    >;
    const original = bundle[key];
    delete bundle[key];
    try {
      await i18n.changeLanguage("es");
      expect(i18n.t(key)).toBe(resources.en[key]);
    } finally {
      bundle[key] = original;
    }
  });
});

describe("runtime localized UI", () => {
  for (const locale of locales) {
    it(`switches the complete interface to ${locale} from Settings`, () => {
      render(<App />);
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));
      const selector = screen.getByRole("combobox", { name: "Language" });
      expect(
        screen
          .getAllByRole("option")
          .filter((option) =>
            locales.includes(
              (option as HTMLOptionElement).value as typeof locale,
            ),
          )
          .map((option) => option.textContent),
      ).toEqual(locales.map((language) => languageNames[language]));
      fireEvent.change(selector, { target: { value: locale } });
      const text = resources[locale];
      expect(document.documentElement.lang).toBe(locale);
      expect(
        screen.getByRole("combobox", { name: text["settings.language"] }),
      ).toHaveValue(locale);
      fireEvent.click(screen.getByRole("button", { name: text["nav.home"] }));
      expect(
        screen.getByRole("heading", { name: text["home.title"] }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("slider", { name: text["controls.bass"] }),
      ).toHaveValue("26");
      fireEvent.click(
        screen.getByRole("button", {
          name: text["help.label"].replace(
            "{{title}}",
            text["help.bass.title"],
          ),
        }),
      );
      expect(screen.getByRole("dialog")).toHaveTextContent(
        text["help.bass.description"],
      );
      fireEvent.keyDown(document, { key: "Escape" });
      fireEvent.click(
        screen.getByRole("button", { name: text["nav.profiles"] }),
      );
      expect(
        screen.getByRole("textbox", { name: text["profiles.name"] }),
      ).toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("button", {
          name: text["nav.equalizer"],
        }),
      );
      expect(
        screen.getByRole("spinbutton", { name: text["eq.frequencyAria"] }),
      ).toHaveValue(1000);
      expect(
        screen.getByRole("combobox", { name: text["eq.filterAria"] }),
      ).toHaveValue("0");
      fireEvent.click(
        screen.getByRole("button", { name: text["nav.spatial"] }),
      );
      expect(screen.getByText(text["spatial.badge"])).toBeInTheDocument();
      expect(
        screen.getByRole("slider", { name: text["controls.crossfeed"] }),
      ).toHaveValue("0");
      fireEvent.click(
        screen.getByRole("button", { name: text["nav.advanced"] }),
      );
      expect(
        screen.getByRole("slider", { name: text["controls.threshold"] }),
      ).toHaveValue("-18");
      fireEvent.click(screen.getByRole("button", { name: text["nav.output"] }));
      expect(
        screen.getByRole("button", { name: text["devices.start"] }),
      ).toBeDisabled();
      expect(screen.getByText(text["devices.nativeOnly"])).toBeInTheDocument();
    });
  }
  it("updates a pinned help dialog and accessible labels without closing it", async () => {
    render(<HelpTooltip help="hrtf" />);
    fireEvent.click(screen.getByRole("button", { name: "Help: HRTF" }));
    for (const locale of ["pt-BR", "es", "ja", "en"] as const) {
      await act(() => setLanguage(locale));
      const text = resources[locale];
      expect(screen.getByRole("dialog")).toHaveTextContent(
        text["help.hrtf.description"],
      );
      expect(
        screen.getByRole("button", {
          name: text["help.label"].replace("{{title}}", "HRTF"),
        }),
      ).toHaveAttribute("aria-expanded", "true");
      expect(document.documentElement.lang).toBe(locale);
    }
  });
  it("switches language without posting native commands or changing audio settings", () => {
    vi.useFakeTimers();
    const post = vi.spyOn(bridge, "post");
    render(<App />);
    act(() => vi.advanceTimersByTime(300));
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    const original = localStorage.getItem("miyazato.settings.v1");
    post.mockClear();
    fireEvent.change(screen.getByRole("combobox", { name: "Language" }), {
      target: { value: "pt-BR" },
    });
    act(() => vi.advanceTimersByTime(300));
    expect(post).not.toHaveBeenCalled();
    expect(localStorage.getItem("miyazato.settings.v1")).toBe(original);
    expect(JSON.parse(original!)).not.toHaveProperty("language");
  });
  it("localizes generated preset names without changing canonical or custom names", async () => {
    const p = preset("Movie", "Night Mode");
    const original = structuredClone(p);
    function Names() {
      const { t } = useI18n();
      return (
        <>
          <span>{profileName(p, t)}</span>
          <span>
            {profileName(
              { ...p, category: "Custom", name: "My Studio / Balanced" },
              t,
            )}
          </span>
        </>
      );
    }
    await i18n.changeLanguage("ja");
    render(<Names />);
    expect(screen.getByText("映画 · ナイトモード")).toBeInTheDocument();
    expect(screen.getByText("My Studio / Balanced")).toBeInTheDocument();
    expect(p).toEqual(original);
  });
  it("localizes known errors and keeps raw device names and unknown diagnostics intact", async () => {
    let receive: ((event: bridge.HostEvent) => void) | undefined;
    vi.spyOn(bridge, "subscribe").mockImplementation((handler) => {
      receive = handler;
      return () => {};
    });
    await i18n.changeLanguage("es");
    render(<App />);
    act(() => {
      receive?.({
        type: "devices",
        devices: [
          {
            id: "headphones",
            name: "Studio DAC / My Headphones",
            channels: 2,
            sampleRate: 48000,
            bits: 32,
            floatFormat: true,
            isDefault: true,
          },
        ],
      });
      receive?.({ type: "error", message: "Cannot save settings" });
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      resources.es["errors.saveSettings"],
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent(
      "Cannot save settings",
    );
    act(() =>
      receive?.({
        type: "error",
        message: "Render buffer failed (HRESULT 0x88890004)",
      }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      resources.es["errors.native"],
    );
    expect(
      screen.getByText(resources.es["errors.details"]),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Render buffer failed (HRESULT 0x88890004)"),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: resources.es["nav.output"] }),
    );
    expect(
      screen.getAllByText("Studio DAC / My Headphones").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(resources.es["devices.default"]),
    ).toBeInTheDocument();
  });
  it("uses locale decimal formatting only for the displayed value", async () => {
    await i18n.changeLanguage("pt-BR");
    const p = preset("Music");
    p.outputDb = -3.5;
    localStorage.setItem(
      "miyazato.settings.v1",
      JSON.stringify({
        version: 1,
        profile: p,
        custom: [],
        effects: "Medium",
        sourceId: "",
        outputId: "",
      }),
    );
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", {
        name: resources["pt-BR"]["nav.advanced"],
      }),
    );
    expect(
      screen.getByRole("slider", {
        name: resources["pt-BR"]["controls.output"],
      }),
    ).toHaveValue("-3.5");
    expect(screen.getByText("-3,5")).toBeInTheDocument();
  });
});
