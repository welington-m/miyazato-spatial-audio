import { useI18n } from "../i18n";
import {
  modeKeys,
  modeDescriptionKeys,
  presetKeys,
  profileName,
} from "../i18n/labels";
import HelpTooltip from "../components/ui/HelpTooltip";
import type { AudioHelpKey } from "../content/audioHelp";
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
import SpectrumAnalyzer from "../components/audio/SpectrumAnalyzer";
import { Meter, Orb } from "../components";
const icons = [Music2, Clapperboard, Gamepad2, Crosshair, Mic, Radio, Wand2];

export default function HomeScreen({
  p,
  analyzer,
  running,
  settings,
  variant,
  choose,
  quick,
}: {
  p: Profile;
  analyzer: Analyzer | null;
  running: boolean;
  settings: Settings;
  variant: string;
  choose: (mode: Mode, variant?: string) => void;
  quick: ReactNode;
}) {
  const { t, number } = useI18n();
  return (
    <>
      <section className="hero-grid">
        <div className="hero panel">
          <div className="hero-heading">
            <span className="section-label">{t("home.listeningSpace")}</span>
            <span className="badge">
              {p.bypass ? t("home.dspBypass") : t("home.stereoFormat")}
            </span>
          </div>
          <Orb level={analyzer?.rmsL || 0} effects={settings.effects} />
          <div className="hero-bottom">
            <span>
              <i />{" "}
              {profileName(
                p,
                t,
                settings.custom.some((saved) => saved.name === p.name),
              )}
            </span>
            <span>{t("home.transitions")}</span>
          </div>
        </div>
        <div className="signal-panel panel">
          <div className="panel-title">
            <Activity size={16} />
            <span>{t("home.signal")}</span>
            <ArrowUpRight size={16} />
          </div>
          <SpectrumAnalyzer
            running={running}
            nativeAvailable={native}
            outputId={settings.outputId}
          />
          <div className="meters">
            <Meter label="L" value={analyzer?.peakL || 0} />
            <Meter label="R" value={analyzer?.peakR || 0} />
          </div>
          <div className="signal-stats">
            <div>
              <small>RMS</small>
              <strong>
                {analyzer
                  ? `${number(20 * Math.log10(Math.max(analyzer.rmsL, 0.000001)), 1)} dB`
                  : "—"}
              </strong>
            </div>
            <div>
              <small>
                {t("home.limiterReduction")} <HelpTooltip help="limiter" />
              </small>
              <strong>
                {analyzer ? `${number(analyzer.reductionDb, 1)} dB` : "—"}
              </strong>
            </div>
          </div>
        </div>
      </section>
      <section className="mode-section">
        <div className="section-heading">
          <div>
            <h2>{t("home.question")}</h2>
            <p>{t("home.startingPoint")}</p>
          </div>
          <span className="muted">{t("home.selectMode")}</span>
        </div>
        <div className="mode-grid">
          {modes.map((mode, i) => {
            const Icon = icons[i];
            return (
              <div className="mode-choice" key={mode}>
                <button
                  className={`mode-card ${p.category === mode ? "selected" : ""}`}
                  key={mode}
                  onClick={() => choose(mode)}
                  aria-pressed={p.category === mode}
                >
                  <span className="mode-icon">
                    <Icon size={23} />
                  </span>
                  <strong>{t(modeKeys[mode])}</strong>
                  <small>{t(modeDescriptionKeys[mode])}</small>
                  <span className="mode-indicator" />
                </button>
                <HelpTooltip help={`mode${mode}` as AudioHelpKey} />
              </div>
            );
          })}
        </div>
        <div className="preset-strip">
          <span>{t("home.preset")}</span>
          <div className="preset-tabs">
            {variants[p.category].map((v) => (
              <button
                key={v}
                className={variant === v ? "selected" : ""}
                onClick={() => choose(p.category, v)}
              >
                {t(presetKeys[v])}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="panel quick-panel">
        <div className="section-heading">
          <h2>{t("home.quickTitle")}</h2>
          <span className="badge">{t("home.quickControls")}</span>
        </div>
        {quick}
      </section>
    </>
  );
}
