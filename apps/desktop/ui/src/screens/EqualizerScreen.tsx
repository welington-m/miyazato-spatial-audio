import { useI18n } from "../i18n";
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
  const { t, number } = useI18n();
  return (
    <>
      <section className="panel eq-panel">
        <div className="section-heading">
          <h2>{t("eq.title")}</h2>
          <button onClick={() => patch({ eq: preset("Custom").eq })}>
            {t("eq.reset")}
          </button>
        </div>
        <EQGraph
          bands={p.eq}
          onChange={(eq) => patch({ eq })}
          sampleRate={sampleRate}
        />
        <p className="muted">{t("eq.instructions")}</p>
      </section>
      <section className="panel">{quick}</section>
    </>
  );
}
