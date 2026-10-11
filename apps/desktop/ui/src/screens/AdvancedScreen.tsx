import HelpTooltip from "../components/ui/HelpTooltip";
import type { Profile } from "../profile";
import { Slider } from "../components";

export default function AdvancedScreen({
  p,
  patch,
}: {
  p: Profile;
  patch: (p: Partial<Profile>) => void;
}) {
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Dynamics · Expert controls</h2>
        <div className="help-label">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={p.compressorEnabled}
              onChange={(e) => patch({ compressorEnabled: e.target.checked })}
            />
            Compressor enabled
          </label>
          <HelpTooltip help="compressor" />
        </div>
      </div>
      <div className="advanced-grid">
        <Slider
          help="Threshold"
          label="Threshold"
          min={-60}
          max={0}
          unit=" dB"
          value={p.thresholdDb}
          onChange={(thresholdDb) => patch({ thresholdDb })}
        />
        <Slider
          help="Ratio"
          label="Ratio"
          min={1}
          max={20}
          unit=":1"
          value={p.ratio}
          onChange={(ratio) => patch({ ratio })}
        />
        <Slider
          help="Attack"
          label="Attack"
          min={0.1}
          max={200}
          unit=" ms"
          value={p.attackMs}
          onChange={(attackMs) => patch({ attackMs })}
        />
        <Slider
          help="Release"
          label="Release"
          min={10}
          max={2000}
          unit=" ms"
          value={p.releaseMs}
          onChange={(releaseMs) => patch({ releaseMs })}
        />
        <Slider
          help="Makeup"
          label="Makeup"
          max={12}
          unit=" dB"
          value={p.makeupDb}
          onChange={(makeupDb) => patch({ makeupDb })}
        />
        <Slider
          help="Input headroom"
          label="Input headroom"
          min={-24}
          max={0}
          unit=" dB"
          value={p.preampDb}
          onChange={(preampDb) => patch({ preampDb })}
        />
        <Slider
          help="Output gain"
          label="Output gain"
          min={-24}
          max={6}
          unit=" dB"
          value={p.outputDb}
          onChange={(outputDb) => patch({ outputDb })}
        />
      </div>
      <p>
        <span className="help-label">
          Limiter <HelpTooltip help="limiter" />
        </span>{" "}
        · Final stereo-linked sample-peak limiter · ceiling 0.98 (−0.18 dBFS).
        True peak oversampling and loudness-matched A/B are not implemented.
        Bypass uses a fixed −6 dB reference and retains output protection.
      </p>
    </section>
  );
}
