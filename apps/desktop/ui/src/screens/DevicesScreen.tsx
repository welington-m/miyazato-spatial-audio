import { useI18n } from "../i18n";
import HelpTooltip from "../components/ui/HelpTooltip";
import { Headphones } from "lucide-react";
import { native, post, type Device, type Status } from "../bridge";
import type { Dispatch, SetStateAction } from "react";
import type { Settings as AppSettings, Profile } from "../profile";
export default function DevicesScreen({
  settings,
  setSettings,
  devices,
  status,
  p,
  setError,
}: {
  settings: AppSettings;
  setSettings: Dispatch<SetStateAction<AppSettings>>;
  devices: Device[];
  status: Status;
  p: Profile;
  setError: (error: string) => void;
}) {
  const { t, number } = useI18n();
  return (
    <>
      <section className="panel">
        <div className="section-heading">
          <h2>{t("devices.title")}</h2>
          <button onClick={() => post("devices.list")}>
            {t("devices.refresh")}
          </button>
        </div>
        <p>{t("devices.description")}</p>
        <div className="source-select">
          <span className="help-label">
            <label htmlFor="capture-source">{t("devices.source")}</label>
            <HelpTooltip help="source" />
          </span>
          <select
            id="capture-source"
            value={settings.sourceId}
            onChange={(e) =>
              setSettings((s) => ({ ...s, sourceId: e.target.value }))
            }
          >
            <option value="">{t("devices.chooseSource")}</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <p className="help-label">
          {t("devices.output")} <HelpTooltip help="output" />
          <HelpTooltip help="sampleRate" />
          <HelpTooltip help="channels" />
        </p>
        <div className="device-list">
          {devices.map((d) => (
            <button
              key={d.id}
              className={`device-card ${settings.outputId === d.id ? "selected" : ""}`}
              onClick={() => setSettings((s) => ({ ...s, outputId: d.id }))}
            >
              <Headphones size={26} />
              <span>
                <strong>{d.name}</strong>
                <small>
                  {t("common.channels", { count: d.channels })} ·{" "}
                  {number(d.sampleRate / 1000)} kHz · {number(d.bits)} bit{" "}
                  {d.floatFormat ? t("common.float") : "PCM"}
                </small>
              </span>
              {d.isDefault && (
                <span className="badge">{t("devices.default")}</span>
              )}
              {settings.outputId === d.id && (
                <span className="badge">{t("devices.selected")}</span>
              )}
              {status.running && status.outputId === d.id && (
                <span className="badge">{t("devices.active")}</span>
              )}
            </button>
          ))}
        </div>
        {!devices.length && (
          <p className="empty-state">
            {native ? t("devices.empty") : t("devices.nativeOnly")}
          </p>
        )}
        <button
          className="primary"
          disabled={
            !native ||
            !settings.sourceId ||
            !settings.outputId ||
            settings.sourceId === settings.outputId
          }
          onClick={() => {
            setError("");
            post("engine.start", {
              sourceId: settings.sourceId,
              outputId: settings.outputId,
            });
            post("profile.set", { profile: p });
          }}
        >
          {t("devices.start")}
        </button>
        <button onClick={() => post("engine.stop")}>{t("devices.stop")}</button>
        <p className="muted">{t("devices.lossNote")}</p>
      </section>
    </>
  );
}
