import i18next from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import en from "./locales/en.json";
import ptBR from "./locales/pt-BR.json";
import es from "./locales/es.json";
import ja from "./locales/ja.json";
import { locales, type Locale, type TranslationKey } from "./types";

export const languageStorageKey = "miyazato.ui.settings.v1";
export const resources = { en, "pt-BR": ptBR, es, ja };
export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}
export function detectLanguage(languages: readonly string[]): Locale {
  for (const language of languages) {
    const base = language.toLowerCase().split(/[-_]/)[0];
    if (base === "pt") return "pt-BR";
    if (base === "es" || base === "ja" || base === "en") return base;
  }
  return "en";
}
export function loadLanguage(): Locale {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(languageStorageKey) || "null",
    );
    if (
      saved &&
      typeof saved === "object" &&
      "language" in saved &&
      isLocale(saved.language)
    )
      return saved.language;
  } catch {
    /* Unavailable or malformed storage must not prevent startup. */
  }
  try {
    return detectLanguage(
      navigator.languages?.length ? navigator.languages : [navigator.language],
    );
  } catch {
    return "en";
  }
}
export const i18n = i18next.createInstance();
void i18n.use(initReactI18next).init({
  resources: Object.fromEntries(
    Object.entries(resources).map(([locale, translation]) => [
      locale,
      { translation },
    ]),
  ),
  lng: loadLanguage(),
  fallbackLng: "en",
  supportedLngs: [...locales],
  load: "currentOnly",
  keySeparator: false,
  initAsync: false,
  interpolation: { escapeValue: false },
});
const updateDocumentLanguage = () => {
  document.documentElement.lang = i18n.resolvedLanguage || "en";
};
i18n.on("languageChanged", updateDocumentLanguage);
updateDocumentLanguage();

export function setLanguage(language: Locale) {
  if (!isLocale(language)) return;
  try {
    localStorage.setItem(languageStorageKey, JSON.stringify({ language }));
  } catch {
    /* Runtime switching remains available for this session. */
  }
  return i18n.changeLanguage(language);
}
export type Translate = (
  key: TranslationKey,
  options?: Record<string, unknown>,
) => string;
export function useI18n() {
  const { t, i18n: instance } = useTranslation(undefined, { i18n });
  const language = isLocale(instance.resolvedLanguage)
    ? instance.resolvedLanguage
    : "en";
  return {
    t: ((key, options) =>
      t(key, { defaultValue: en[key], ...options })) as Translate,
    language,
    number: (value: number, digits = 0) =>
      new Intl.NumberFormat(language, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(value),
  };
}
