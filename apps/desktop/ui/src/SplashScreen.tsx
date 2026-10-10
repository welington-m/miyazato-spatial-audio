import { branding } from "./config/branding";
// Optional reusable visual: no startup timer, overlay or startup delay is installed.
export default function SplashScreen() {
  return (
    <section
      className="brand-splash"
      aria-label={`${branding.appName} loading`}
      aria-busy="true"
    >
      <img
        src={branding.splash.primary}
        alt={`${branding.appName} — ${branding.tagline}`}
        width={1920}
        height={1080}
      />
      <span role="status">Loading {branding.appName}…</span>
    </section>
  );
}
