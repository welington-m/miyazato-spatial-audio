import BrandLogo from "../BrandLogo";
import { branding } from "../config/branding";
import type { Dispatch, SetStateAction } from "react";
import { initialSettings, type Settings as AppSettings } from "../profile";
export default function SettingsScreen({
  settings,
  setSettings,
}: {
  settings: AppSettings;
  setSettings: Dispatch<SetStateAction<AppSettings>>;
}) {
  return (
    <section className="panel settings-panel">
      <div className="about-brand">
        <BrandLogo />
        <div>
          <h2>{branding.appName}</h2>
          <p>{branding.tagline}</p>
          <small>Version {branding.version}</small>
        </div>
      </div>
      <h2>Personalize your space</h2>
      <label>
        Visual effects
        <select
          value={settings.effects}
          onChange={(e) =>
            setSettings((s) => ({
              ...s,
              effects: e.target.value as AppSettings["effects"],
            }))
          }
        >
          {["Off", "Low", "Medium", "High"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <p>
        Settings are stored in %APPDATA%/MiyazatoSpatialEngine/settings.json in
        the native app; browser previews use localStorage.
      </p>
      <p>
        Internal DSP: float32. Spatial processing: bypass. Spectrum: mock.
        System-wide interception: requires future APO or virtual audio device.
      </p>
      <button onClick={() => setSettings(structuredClone(initialSettings))}>
        Restore defaults
      </button>
    </section>
  );
}
