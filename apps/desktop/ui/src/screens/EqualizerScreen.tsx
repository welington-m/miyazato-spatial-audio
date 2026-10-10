import type { ReactNode } from "react";
import { preset, type Profile } from "../profile";
import EQGraph from "../EQGraph";
export default function EqualizerScreen({
  p,
  patch,
  sampleRate,
  quick,
}: {
  p: Profile;
  patch: (p: Partial<Profile>) => void;
  sampleRate: number;
  quick: ReactNode;
}) {
  return (
    <>
      <section className="panel eq-panel">
        <div className="section-heading">
          <h2>Parametric equalizer</h2>
          <button onClick={() => patch({ eq: preset("Custom").eq })}>
            Reset bands
          </button>
        </div>
        <EQGraph
          bands={p.eq}
          onChange={(eq) => patch({ eq })}
          sampleRate={sampleRate}
        />
        <p className="muted">
          Drag to shape frequency and gain. Arrow keys adjust selected band
          gain. Coefficients transition over 100 ms.
        </p>
      </section>
      <section className="panel">{quick}</section>
    </>
  );
}
