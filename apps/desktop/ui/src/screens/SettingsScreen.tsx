import { useI18n } from "../i18n";
import LanguageSelector from "../components/ui/LanguageSelector";
import type { TranslationKey } from "../i18n/types";
const effectKeys: Record<string, TranslationKey> = {
  Off: "settings.effectsOff",
  Low: "settings.effectsLow",
  Medium: "settings.effectsMedium",
  High: "settings.effectsHigh",
};
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
  const { t, number } = useI18n();
  return (
    <section className="panel settings-panel">
      <div className="about-brand">
        <BrandLogo />
        <div>
          <h2>{branding.appName}</h2>
          <p>{t("brand.precisionTagline")}</p>
          <small>{t("common.version", { version: branding.version })}</small>
        </div>
      </div>
      <h2>{t("settings.title")}</h2>
      <LanguageSelector />
      <label>
        {t("settings.effects")}
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
            <option key={v} value={v}>
              {t(effectKeys[v])}
            </option>
          ))}
        </select>
      </label>
      <p>{t("settings.storage")}</p>
      <p>{t("settings.implementation")}</p>
      <button onClick={() => setSettings(structuredClone(initialSettings))}>
        {t("settings.restore")}
      </button>
    </section>
  );
}
