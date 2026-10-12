import { useI18n } from "./i18n";
import HelpTooltip from "./components/ui/HelpTooltip";
import type { AudioHelpKey } from "./content/audioHelp";
import { useEffect, useRef, useId } from "react";
import type { Analyzer } from "./bridge";
export function Slider({
  label,
  value,
  min = 0,
  max = 100,
  unit = "",
  onChange,
  help,
}: {
  help?: AudioHelpKey;
  label: string;
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const { number } = useI18n();
  const id = useId();
  return (
    <div className="slider">
      <span>
        <span className="help-label">
          <label htmlFor={id}>{label}</label>
          {help && <HelpTooltip help={help} />}
        </span>
        <strong>
          {number(value, value % 1 ? 1 : 0)}
          <small>{unit}</small>
        </strong>
      </span>
      <input
        id={id}
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={0.1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
export function Meter({ label, value }: { label: string; value: number }) {
  const { number } = useI18n();
  return (
    <div className="meter">
      <span>{label}</span>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={-60}
        aria-valuemax={0}
        aria-valuenow={Math.max(-60, 20 * Math.log10(Math.max(value, 0.001)))}
      >
        <i style={{ width: `${Math.min(100, value * 100)}%` }} />
      </div>
      <small>
        {value > 0
          ? `${number(Math.max(-60, 20 * Math.log10(value)), 1)} dB`
          : "−∞"}
      </small>
    </div>
  );
}
export function Spectrum({
  analyzer,
  mock,
}: {
  analyzer: Analyzer | null;
  mock: boolean;
}) {
  const { t } = useI18n();
  // Mock spectrum is static and explicitly identified. Real FFT is not inferred from decimated waveform.
  const heights = Array.from({ length: 64 }, (_, i) =>
    Math.max(6, (Math.sin(i * 0.23) * 0.25 + 0.45) * Math.exp(-i / 95) * 100),
  );
  return (
    <div className="spectrum-panel">
      <div className="section-label">
        {t("spectrum.title")}{" "}
        <span className="badge">{t("spectrum.pending")}</span>
      </div>
      <div className="spectrum" aria-label={t("spectrum.aria")}>
        {heights.map((h, i) => (
          <i key={i} style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="frequency-labels">
        <span>20 Hz</span>
        <span>100</span>
        <span>1k</span>
        <span>10k</span>
        <span>20k Hz</span>
      </div>
      <small>
        {mock
          ? t("spectrum.preview")
          : analyzer
            ? t("spectrum.live")
            : t("spectrum.stopped")}
      </small>
    </div>
  );
}
export function Orb({ level, effects }: { level: number; effects: string }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.style.setProperty(
      "--audio-scale",
      String(1 + Math.min(level, 1) * 0.15),
    );
  }, [level]);
  return (
    <div className={`orb-stage effects-${effects.toLowerCase()}`}>
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <div ref={ref} className="orb">
        <div className="orb-core" />
        <div className="orb-lines" />
      </div>
      <span className="orb-label">
        {t("orb.stereo")}
        <span>{t("brand.tagline")}</span>
      </span>
    </div>
  );
}
export function SpatialVisualizer() {
  const { t } = useI18n();
  return (
    <div className="spatial-map" aria-label={t("spatial.layoutAria")}>
      <span className="front-label">{t("spatial.front")}</span>
      {["FL", "C", "FR", "SL", "SR", "RL", "RR"].map((ch, i) => (
        <span className={`speaker speaker-${i}`} key={ch}>
          {ch}
        </span>
      ))}
      <div className="head">
        ◯<span>⌒</span>
      </div>
      <small>{t("spatial.layoutNote")}</small>
    </div>
  );
}
