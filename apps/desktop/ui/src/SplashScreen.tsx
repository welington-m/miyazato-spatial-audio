import { useI18n } from "./i18n";
import { branding } from "./config/branding";
// Optional reusable visual: no startup timer, overlay or startup delay is installed.
export default function SplashScreen() {
  const { t, number } = useI18n();
  return (
    <section
      className="brand-splash"
      aria-label={t("common.loading", { appName: branding.appName })}
      aria-busy="true"
    >
      <img
        src={branding.splash.primary}
        alt={`${branding.appName} — ${t("brand.precisionTagline")}`}
        width={1920}
        height={1080}
      />
      <span role="status">
        {t("common.loading", { appName: branding.appName })}
      </span>
    </section>
  );
}
