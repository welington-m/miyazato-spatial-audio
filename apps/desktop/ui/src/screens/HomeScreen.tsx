import {
  Activity,
  ArrowUpRight,
  Music2,
  Clapperboard,
  Gamepad2,
  Crosshair,
  Mic,
  Radio,
  Wand2,
} from "lucide-react";
import type { ReactNode } from "react";
import { native, type Analyzer } from "../bridge";
import {
  modes,
  variants,
  type Profile,
  type Mode,
  type Settings,
} from "../profile";
import { Meter, Spectrum, Orb } from "../components";
const icons = [Music2, Clapperboard, Gamepad2, Crosshair, Mic, Radio, Wand2];
const descriptions = [
  "Every note, beautifully balanced",
  "A little closer to the big screen",
  "Get lost in your next world",
  "Focus on the details that matter",
  "Clear voices. Better conversations.",
  "Make everyday listening better",
  "Sound, on your terms",
];

export default function HomeScreen({
  p,
  analyzer,
  settings,
  variant,
  choose,
  quick,
}: {
  p: Profile;
  analyzer: Analyzer | null;
  settings: Settings;
  variant: string;
  choose: (mode: Mode, variant?: string) => void;
  quick: ReactNode;
}) {
  return (
    <>
      <section className="hero-grid">
        <div className="hero panel">
          <div className="hero-heading">
            <span className="section-label">YOUR LISTENING SPACE</span>
            <span className="badge">
              {p.bypass ? "DSP BYPASS" : "STEREO · FLOAT32"}
            </span>
          </div>
          <Orb level={analyzer?.rmsL || 0} effects={settings.effects} />
          <div className="hero-bottom">
            <span>
              <i /> {p.name}
            </span>
            <span>100 ms parameter transitions</span>
          </div>
        </div>
        <div className="signal-panel panel">
          <div className="panel-title">
            <Activity size={16} />
            <span>Signal overview</span>
            <ArrowUpRight size={16} />
          </div>
          <Spectrum analyzer={analyzer} mock={!native} />
          <div className="meters">
            <Meter label="L" value={analyzer?.peakL || 0} />
            <Meter label="R" value={analyzer?.peakR || 0} />
          </div>
          <div className="signal-stats">
            <div>
              <small>RMS</small>
              <strong>
                {analyzer
                  ? `${(20 * Math.log10(Math.max(analyzer.rmsL, 0.000001))).toFixed(1)} dB`
                  : "—"}
              </strong>
            </div>
            <div>
              <small>LIMITER GR</small>
              <strong>
                {analyzer ? `${analyzer.reductionDb.toFixed(1)} dB` : "—"}
              </strong>
            </div>
          </div>
        </div>
      </section>
      <section className="mode-section">
        <div className="section-heading">
          <div>
            <h2>What are you listening to?</h2>
            <p>A starting point for every kind of moment.</p>
          </div>
          <span className="muted">SELECT YOUR AUDIO MODE</span>
        </div>
        <div className="mode-grid">
          {modes.map((mode, i) => {
            const Icon = icons[i];
            return (
              <button
                className={`mode-card ${p.category === mode ? "selected" : ""}`}
                key={mode}
                onClick={() => choose(mode)}
                aria-pressed={p.category === mode}
              >
                <span className="mode-icon">
                  <Icon size={23} />
                </span>
                <strong>{mode === "Movie" ? "Movies" : mode}</strong>
                <small>{descriptions[i]}</small>
                <span className="mode-indicator" />
              </button>
            );
          })}
        </div>
        <div className="preset-strip">
          <span>LISTENING PRESET</span>
          <div className="preset-tabs">
            {variants[p.category].map((v) => (
              <button
                key={v}
                className={variant === v ? "selected" : ""}
                onClick={() => choose(p.category, v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="panel quick-panel">
        <div className="section-heading">
          <h2>Make it feel right.</h2>
          <span className="badge">QUICK CONTROLS</span>
        </div>
        {quick}
      </section>
    </>
  );
}
