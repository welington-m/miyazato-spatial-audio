import { useI18n } from "../i18n";
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
  const { t, number } = useI18n();
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>{t("advanced.title")}</h2>
        <div className="help-label">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={p.compressorEnabled}
              onChange={(e) => patch({ compressorEnabled: e.target.checked })}
            />
            {t("advanced.enabled")}
          </label>
          <HelpTooltip help="compressor" />
        </div>
      </div>
      <div className="advanced-grid">
        <Slider
          help="Threshold"
          label={t("controls.threshold")}
          min={-60}
          max={0}
          unit=" dB"
          value={p.thresholdDb}
          onChange={(thresholdDb) => patch({ thresholdDb })}
        />
        <Slider
          help="Ratio"
          label={t("controls.ratio")}
          min={1}
          max={20}
          unit=":1"
          value={p.ratio}
          onChange={(ratio) => patch({ ratio })}
        />
        <Slider
          help="Attack"
          label={t("controls.attack")}
          min={0.1}
          max={200}
          unit=" ms"
          value={p.attackMs}
          onChange={(attackMs) => patch({ attackMs })}
        />
        <Slider
          help="Release"
          label={t("controls.release")}
          min={10}
          max={2000}
          unit=" ms"
          value={p.releaseMs}
          onChange={(releaseMs) => patch({ releaseMs })}
        />
        <Slider
          help="Makeup"
          label={t("controls.makeup")}
          max={12}
          unit=" dB"
          value={p.makeupDb}
          onChange={(makeupDb) => patch({ makeupDb })}
        />
        <Slider
          help="Input headroom"
          label={t("controls.headroom")}
          min={-24}
          max={0}
          unit=" dB"
          value={p.preampDb}
          onChange={(preampDb) => patch({ preampDb })}
        />
        <Slider
          help="Output gain"
          label={t("controls.output")}
          min={-24}
          max={6}
          unit=" dB"
          value={p.outputDb}
          onChange={(outputDb) => patch({ outputDb })}
        />
      </div>
      <p>
        <span className="help-label">
          {t("advanced.limiter")} <HelpTooltip help="limiter" />
        </span>{" "}
        · {t("advanced.note")}
      </p>
    </section>
  );
}
