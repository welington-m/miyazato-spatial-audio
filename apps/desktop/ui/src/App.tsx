import { useI18n } from "./i18n";
import { navKeys } from "./i18n/labels";
import { errorKey } from "./i18n/errors";
import HelpTooltip from "./components/ui/HelpTooltip";
import BrandLogo from "./BrandLogo";
import { branding } from "./config/branding";
import { useRef, useState } from "react";
import {
  House,
  Layers3,
  SlidersHorizontal,
  Orbit,
  Settings2,
  Headphones,
  Settings,
  Power,
  ChevronDown,
  Save,
} from "lucide-react";
import { variants, preset, type Profile, type Mode } from "./profile";
import { native } from "./bridge";
import { Slider } from "./components";
import { useAudioSession } from "./useAudioSession";
import HomeScreen from "./screens/HomeScreen";
import EqualizerScreen from "./screens/EqualizerScreen";
import SpatialScreen from "./screens/SpatialScreen";
import DevicesScreen from "./screens/DevicesScreen";
import AdvancedScreen from "./screens/AdvancedScreen";
import SettingsScreen from "./screens/SettingsScreen";
const nav = [
  ["Home", House],
  ["Audio Profiles", Layers3],
  ["Equalizer", SlidersHorizontal],
  ["Spatial Audio", Orbit],
  ["Advanced", Settings2],
  ["Output Device", Headphones],
  ["Settings", Settings],
] as const;
export default function App() {
  const { t, number, language } = useI18n();
  const {
    settings,
    setSettings,
    devices,
    analyzer,
    status,
    error,
    setError,
    p,
    patch,
  } = useAudioSession();
  const [page, setPage] = useState("Home"),
    [slot, setSlot] = useState<"A" | "B">("A"),
    [customName, setCustomName] = useState("");
  const slots = useRef<Record<"A" | "B", Profile>>({
    A: settings.profile,
    B: preset("Music", "Hi-Fi"),
  });
  const variant =
    variants[p.category].find((v) => p.name === `${p.category} ${v}`) ??
    (p.category === "Custom" ? "Personal" : "");
  const choose = (mode: Mode, v = variants[mode][0]) => {
    setSettings((s) => ({
      ...s,
      profile: { ...preset(mode, v), bypass: s.profile.bypass },
    }));
  };
  const device = devices.find(
    (d) => d.id === (status.running ? status.outputId : settings.outputId),
  );
  const swap = (next: "A" | "B") => {
    if (next === slot) return;
    slots.current[slot] = structuredClone(p);
    setSettings((s) => ({
      ...s,
      profile: structuredClone(slots.current[next]),
    }));
    setSlot(next);
  };
  const quick = (
    <div className="quick-grid">
      <Slider
        help="stereoWidth"
        label={t("controls.width")}
        value={p.width}
        max={200}
        unit="%"
        onChange={(width) => patch({ width })}
      />
      <Slider
        help="bass"
        label={t("controls.bass")}
        value={p.bass}
        onChange={(bass) => patch({ bass })}
      />
      <Slider
        help="clarity"
        label={t("controls.clarity")}
        value={p.clarity}
        onChange={(clarity) => patch({ clarity })}
      />
      <div className="pending-control">
        <span className="help-label">
          {t("controls.spatial")} <HelpTooltip help="spatial" />
        </span>
        <strong>{t("status.phaseTwo")}</strong>
        <small>{t("home.spatialNote")}</small>
      </div>
    </div>
  );
  const saveCustom = () => {
    if (!customName.trim()) return;
    setSettings((s) => ({
      ...s,
      custom: [
        ...s.custom,
        { ...structuredClone(p), name: customName.trim(), category: "Custom" },
      ],
    }));
    setCustomName("");
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("Home");
          }}
        >
          <div className="brand-mark">
            <BrandLogo compact />
          </div>
          <span>
            MIYAZATO<small>SPATIAL ENGINE</small>
          </span>
        </a>
        <div className="nav-label">{t("sidebar.space")}</div>
        <nav>
          {nav.map(([name, Icon]) => (
            <button
              key={name}
              className={page === name ? "nav-item active" : "nav-item"}
              onClick={() => setPage(name)}
            >
              <Icon size={19} />
              {t(navKeys[name])}
              {name === "Home" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="engine-chip">
            <span className={status.running ? "live-dot" : "idle-dot"} />
            {status.running
              ? t("status.engineActive")
              : native
                ? t("status.engineStopped")
                : t("status.browserPreview")}
          </div>
          <p>{t("sidebar.tagline")}</p>
          <span className="version">
            {t("sidebar.version", { version: branding.version })}
          </span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="topbar-path" title={t("brand.precisionTagline")}>
            {branding.appName}
          </span>
          <button
            className="device-top"
            onClick={() => setPage("Output Device")}
          >
            <Headphones size={18} />
            <span>
              {device?.name || t("devices.selectOutput")}
              <small>
                {device
                  ? `${number(device.sampleRate / 1000, 1)} kHz · ${t("common.channels", { count: device.channels })}`
                  : t("devices.noActive")}
              </small>
            </span>
            <ChevronDown size={15} />
          </button>
          <div className="topbar-divider" />
          <button
            className={`power ${!p.bypass ? "on" : ""}`}
            aria-label={
              p.bypass ? t("processing.enable") : t("processing.disable")
            }
            title={t("processing.powerTitle")}
            onClick={() => patch({ bypass: !p.bypass })}
          >
            <Power size={21} />
          </button>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                MIYAZATO / {t(navKeys[page]).toLocaleUpperCase(language)}
              </div>
              <h1>{page === "Home" ? t("home.title") : t(navKeys[page])}</h1>
              <p>
                {page === "Home"
                  ? t("home.subtitle")
                  : page === "Equalizer"
                    ? t("page.equalizerSubtitle")
                    : t("page.subtitle")}
              </p>
            </div>
            <div className="comparison">
              <div className="ab">
                <button
                  className={slot === "A" ? "selected" : ""}
                  onClick={() => swap("A")}
                >
                  A
                </button>
                <button
                  className={slot === "B" ? "selected" : ""}
                  onClick={() => swap("B")}
                >
                  B
                </button>
              </div>
              <button
                className={p.bypass ? "bypass selected" : "bypass"}
                aria-pressed={p.bypass}
                onClick={() => patch({ bypass: !p.bypass })}
              >
                {t("status.bypass")}
              </button>
              <HelpTooltip help="bypass" />
            </div>
          </div>
          {!native && (
            <div className="preview-note">
              <span className="badge">{t("preview.badge")}</span>{" "}
              {t("preview.note")}
            </div>
          )}
          {(error || status.error) && (
            <div className="error" role="alert">
              {t(errorKey(error || status.error) ?? "errors.native")}
              {!errorKey(error || status.error) && (
                <details>
                  <summary>{t("errors.details")}</summary>
                  <pre>{error || status.error}</pre>
                </details>
              )}
              <button onClick={() => setError("")}>
                {t("common.dismiss")}
              </button>
            </div>
          )}
          {(page === "Home" || page === "Audio Profiles") && (
            <>
              <HomeScreen
                p={p}
                analyzer={analyzer}
                running={status.running}
                settings={settings}
                variant={variant}
                choose={choose}
                quick={quick}
              />
              {page === "Audio Profiles" && (
                <section className="panel">
                  <h2>{t("profiles.title")}</h2>
                  <div className="save-profile">
                    <input
                      aria-label={t("profiles.name")}
                      placeholder={t("profiles.placeholder")}
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                    />
                    <button className="primary" onClick={saveCustom}>
                      <Save size={16} />
                      {t("profiles.save")}
                    </button>
                  </div>
                  {settings.custom.map((profile, i) => (
                    <div className="saved-profile" key={i}>
                      <button
                        onClick={() => {
                          setSettings((s) => ({
                            ...s,
                            profile: structuredClone(profile),
                          }));
                        }}
                      >
                        {profile.name}
                      </button>
                      <button
                        onClick={() =>
                          setSettings((s) => ({
                            ...s,
                            custom: s.custom.filter((_, index) => index !== i),
                          }))
                        }
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
          {page === "Equalizer" && (
            <EqualizerScreen
              p={p}
              patch={patch}
              sampleRate={device?.sampleRate || 48000}
              quick={quick}
            />
          )}
          {page === "Spatial Audio" && <SpatialScreen p={p} patch={patch} />}
          {page === "Output Device" && (
            <DevicesScreen
              settings={settings}
              setSettings={setSettings}
              devices={devices}
              status={status}
              p={p}
              setError={setError}
            />
          )}
          {page === "Advanced" && <AdvancedScreen p={p} patch={patch} />}
          {page === "Settings" && (
            <SettingsScreen settings={settings} setSettings={setSettings} />
          )}
        </main>
        <footer>
          <span>
            <i className={status.running ? "live-dot" : "idle-dot"} />
            {status.running
              ? t("status.audioEngineActive")
              : native
                ? t("status.audioEngineStopped")
                : t("status.noEngine")}
          </span>
          <span>
            {device
              ? `${number(device.sampleRate / 1000)} kHz · 32-bit ${t("common.float")} DSP · ${t("common.channels", { count: device.channels })}`
              : t("status.noFormat")}
            <HelpTooltip help="sampleRate" />
            <HelpTooltip help="channels" />
          </span>
          <span>
            {t("status.buffer")}{" "}
            {status.running ? `${number(status.bufferMs, 1)} ms` : "—"}
            <HelpTooltip help="buffer" />
            <HelpTooltip help="latency" />
          </span>
          <span>
            {t("status.callback")}{" "}
            {status.running ? `${number(status.callbackMs, 2)} ms` : "—"}
            <HelpTooltip help="callback" />
          </span>
          <span>
            {t("status.glitches")} {number(status.glitches)}
            <HelpTooltip help="glitches" /> · {t("status.underruns")}{" "}
            {number(status.underruns)}
            <HelpTooltip help="underruns" /> · {t("status.overruns")}{" "}
            {number(status.overruns)}
            <HelpTooltip help="overruns" />
          </span>
        </footer>
      </div>
    </div>
  );
}
