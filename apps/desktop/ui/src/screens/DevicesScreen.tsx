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
  return (
    <>
      <section className="panel">
        <div className="section-heading">
          <h2>Audio endpoints</h2>
          <button onClick={() => post("devices.list")}>Refresh devices</button>
        </div>
        <p>
          Prototype loopback route: play audio on the source endpoint and listen
          on a separate output. Matching stereo float32 sample rates are
          required.
        </p>
        <div className="source-select">
          <span className="help-label">
            <label htmlFor="capture-source">Capture source</label>
            <HelpTooltip help="source" />
          </span>
          <select
            id="capture-source"
            value={settings.sourceId}
            onChange={(e) =>
              setSettings((s) => ({ ...s, sourceId: e.target.value }))
            }
          >
            <option value="">Choose source endpoint</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <p className="help-label">
          Output device <HelpTooltip help="output" />
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
                  {d.channels} ch · {d.sampleRate / 1000} kHz · {d.bits} bit{" "}
                  {d.floatFormat ? "float" : "PCM"}
                </small>
              </span>
              {d.isDefault && <span className="badge">DEFAULT</span>}
              {settings.outputId === d.id && (
                <span className="badge">SELECTED</span>
              )}
              {status.running && status.outputId === d.id && (
                <span className="badge">ACTIVE</span>
              )}
            </button>
          ))}
        </div>
        {!devices.length && (
          <p className="empty-state">
            {native
              ? "No endpoints found. Refresh to enumerate."
              : "Device enumeration is available in the Windows desktop host."}
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
          Start prototype route
        </button>
        <button onClick={() => post("engine.stop")}>Stop</button>
        <p className="muted">
          Device loss stops the route safely and reports an error. Refresh,
          choose available endpoints and restart. Automatic reconnect is
          pending.
        </p>
      </section>
    </>
  );
}
