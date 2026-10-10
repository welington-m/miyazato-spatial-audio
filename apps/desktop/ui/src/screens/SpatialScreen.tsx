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
          label="Stereo width"
          max={200}
          value={p.width}
          unit="%"
          onChange={(width) => patch({ width })}
        />
        <Slider
          label="Basic crossfeed"
          value={p.crossfeed}
          onChange={(crossfeed) => patch({ crossfeed })}
        />
        <small>
          Crossfeed currently mixes L/R directly; frequency-dependent crossfeed
          is pending.
        </small>
      </div>
      <SpatialVisualizer />
    </section>
  );
}
