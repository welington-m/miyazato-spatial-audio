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
        label="Stereo width"
        value={p.width}
        max={200}
        unit="%"
        onChange={(width) => patch({ width })}
      />
      <Slider
        help="bass"
        label="Bass"
        value={p.bass}
        onChange={(bass) => patch({ bass })}
      />
      <Slider
        help="clarity"
        label="Clarity"
        value={p.clarity}
        onChange={(clarity) => patch({ clarity })}
      />
      <div className="pending-control">
        <span className="help-label">
          Spatial / Immersion <HelpTooltip help="spatial" />
        </span>
        <strong>Phase 2</strong>
        <small>HRTF & room modeling · bypass</small>
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
        <div className="nav-label">YOUR SOUND SPACE</div>
        <nav>
          {nav.map(([name, Icon]) => (
            <button
              key={name}
              className={page === name ? "nav-item active" : "nav-item"}
              onClick={() => setPage(name)}
            >
              <Icon size={19} />
              {name}
              {name === "Home" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="engine-chip">
            <span className={status.running ? "live-dot" : "idle-dot"} />
            {status.running
              ? "Engine active"
              : native
                ? "Engine stopped"
                : "Browser preview"}
          </div>
          <p>Crafted for the way you listen.</p>
          <span className="version">
            VERSION {branding.version} · FOUNDATION
          </span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="topbar-path" title={branding.tagline}>
            {branding.appName}
          </span>
          <button
            className="device-top"
            onClick={() => setPage("Output Device")}
          >
            <Headphones size={18} />
            <span>
              {device?.name || "Select an output"}
              <small>
                {device
                  ? `${(device.sampleRate / 1000).toFixed(1)} kHz · ${device.channels} ch`
                  : "No endpoint active"}
              </small>
            </span>
            <ChevronDown size={15} />
          </button>
          <div className="topbar-divider" />
          <button
            className={`power ${!p.bypass ? "on" : ""}`}
            aria-label={p.bypass ? "Enable processing" : "Disable processing"}
            title="Processing power (−6 dB dry reference; safety limiter stays active)"
            onClick={() => patch({ bypass: !p.bypass })}
          >
            <Power size={21} />
          </button>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">MIYAZATO / {page.toUpperCase()}</div>
              <h1>{page === "Home" ? "Find your sound." : page}</h1>
              <p>
                {page === "Home"
                  ? "Give every moment a new dimension. Make it yours."
                  : page === "Equalizer"
                    ? "Shape the details. Ten bands, one effortless curve."
                    : "Your listening experience, finely tuned."}
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
                BYPASS
              </button>
              <HelpTooltip help="bypass" />
            </div>
          </div>
          {!native && (
            <div className="preview-note">
              <span className="badge">UI PREVIEW</span> No Windows audio
              connection. Controls are saved locally; DSP runs only in the
              native host.
            </div>
          )}
          {(error || status.error) && (
            <div className="error" role="alert">
              {error || status.error}
              <button onClick={() => setError("")}>Dismiss</button>
            </div>
          )}
          {(page === "Home" || page === "Audio Profiles") && (
            <>
              <HomeScreen
                p={p}
                analyzer={analyzer}
                settings={settings}
                variant={variant}
                choose={choose}
                quick={quick}
              />
              {page === "Audio Profiles" && (
                <section className="panel">
                  <h2>Your profiles</h2>
                  <div className="save-profile">
                    <input
                      aria-label="Custom profile name"
                      placeholder="Name your profile"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                    />
                    <button className="primary" onClick={saveCustom}>
                      <Save size={16} />
                      Save current
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
                        Delete
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
              ? "Audio engine active"
              : native
                ? "Audio engine stopped"
                : "Preview · no audio engine"}
          </span>
          <span>
            {device
              ? `${device.sampleRate / 1000} kHz · 32-bit float DSP · ${device.channels} ch`
              : "No active audio format"}
            <HelpTooltip help="sampleRate" />
            <HelpTooltip help="channels" />
          </span>
          <span>
            Buffer {status.running ? `${status.bufferMs.toFixed(1)} ms` : "—"}
            <HelpTooltip help="buffer" />
            <HelpTooltip help="latency" />
          </span>
          <span>
            Callback{" "}
            {status.running ? `${status.callbackMs.toFixed(2)} ms` : "—"}
            <HelpTooltip help="callback" />
          </span>
          <span>
            Glitches {status.glitches}
            <HelpTooltip help="glitches" /> · Underruns {status.underruns}
            <HelpTooltip help="underruns" /> · Overruns {status.overruns}
            <HelpTooltip help="overruns" />
          </span>
        </footer>
      </div>
    </div>
  );
}
