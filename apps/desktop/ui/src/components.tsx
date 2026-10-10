import { useEffect, useRef } from "react";
import type { Analyzer } from "./bridge";
export function Slider({
  label,
  value,
  min = 0,
  max = 100,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="slider">
      <span>
        {label}
        <strong>
          {value.toFixed(value % 1 ? 1 : 0)}
          <small>{unit}</small>
        </strong>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={0.1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
export function Meter({ label, value }: { label: string; value: number }) {
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
          ? `${Math.max(-60, 20 * Math.log10(value)).toFixed(1)} dB`
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
  // Mock spectrum is static and explicitly identified. Real FFT is not inferred from decimated waveform.
  const heights = Array.from({ length: 64 }, (_, i) =>
    Math.max(6, (Math.sin(i * 0.23) * 0.25 + 0.45) * Math.exp(-i / 95) * 100),
  );
  return (
    <div className="spectrum-panel">
      <div className="section-label">
        FREQUENCY SPECTRUM <span className="badge">MOCK · FFT pending</span>
      </div>
      <div className="spectrum" aria-label="Static mock spectrum">
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
          ? "Browser preview · no audio processing"
          : analyzer
            ? "Live peak / RMS below · spectrum remains a mock"
            : "Engine stopped · spectrum is illustrative"}
      </small>
    </div>
  );
}
export function Orb({ level, effects }: { level: number; effects: string }) {
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
        STEREO ENGINE<span>Original DSP. Your sound.</span>
      </span>
    </div>
  );
}
export function SpatialVisualizer() {
  return (
    <div
      className="spatial-map"
      aria-label="Surround layout preview, processing not implemented"
    >
      <span className="front-label">FRONT</span>
      {["FL", "C", "FR", "SL", "SR", "RL", "RR"].map((ch, i) => (
        <span className={`speaker speaker-${i}`} key={ch}>
          {ch}
        </span>
      ))}
      <div className="head">
        ◯<span>⌒</span>
      </div>
      <small>Layout preview · HRTF bypass</small>
    </div>
  );
}
