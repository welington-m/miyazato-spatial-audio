import HelpTooltip from "../components/ui/HelpTooltip";
import type { AudioHelpKey } from "../content/audioHelp";
import { audioHelp } from "../content/audioHelp";
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
  return (
    <section className="panel spatial-content">
      <div>
        <span className="badge">PHASE 2 · NOT IMPLEMENTED</span>
        <h2>A foundation for a wider world.</h2>
        <p>
          HRTF, 5.1 / 7.1 virtualization, upmix and room modeling are bypassed.
          This view previews the planned layout.
        </p>
        <Slider
          help="stereoWidth"
          label="Stereo width"
          max={200}
          value={p.width}
          unit="%"
          onChange={(width) => patch({ width })}
        />
        <Slider
          help="crossfeed"
          label="Basic crossfeed"
          value={p.crossfeed}
          onChange={(crossfeed) => patch({ crossfeed })}
        />
        <small>
          Crossfeed currently mixes L/R directly; frequency-dependent crossfeed
          is pending.
        </small>
        <div className="planned-help" aria-label="Planned spatial features">
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
              {audioHelp[key].title}
              <HelpTooltip help={key} />
            </span>
          ))}
        </div>
      </div>
      <SpatialVisualizer />
    </section>
  );
}
