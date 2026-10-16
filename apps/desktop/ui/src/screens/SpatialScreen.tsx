import { useI18n } from "../i18n";
import HelpTooltip from "../components/ui/HelpTooltip";
import type { AudioHelpKey } from "../content/audioHelp";
import { helpKey } from "../content/audioHelp";
import type { Profile } from "../profile";
import { Slider } from "../components";
import { SpatialVisualizer } from "../components";
export default function SpatialScreen({
  p,
  patch,
}: {
  p: Profile;
  patch: (p: Partial<Profile>) => void;
}) {
  const { t, number } = useI18n();
  return (
    <section className="panel spatial-content">
      <div>
        <span className="badge">{t("spatial.badge")}</span>
        <h2>{t("spatial.title")}</h2>
        <p>{t("spatial.description")}</p>
        <Slider
          help="stereoWidth"
          label={t("controls.width")}
          max={200}
          value={p.width}
          unit="%"
          onChange={(width) => patch({ width })}
        />
        <Slider
          help="crossfeed"
          label={t("controls.crossfeed")}
          value={p.crossfeed}
          onChange={(crossfeed) => patch({ crossfeed })}
        />
        <small>{t("spatial.crossfeedNote")}</small>
        <div className="planned-help" aria-label={t("spatial.plannedFeatures")}>
          {(
            [
              "intensity",
              "room",
              "front",
              "rear",
              "height",
              "center",
              "hrtf",
              "surround",
              "upmix",
            ] as AudioHelpKey[]
          ).map((key) => (
            <span className="help-label" key={key}>
              {t(helpKey(key, "title"))}
              <HelpTooltip help={key} />
            </span>
          ))}
        </div>
      </div>
      <SpatialVisualizer />
    </section>
  );
}
