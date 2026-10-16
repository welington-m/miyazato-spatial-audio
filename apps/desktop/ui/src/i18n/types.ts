import type en from "./locales/en.json";
export const locales = ["pt-BR", "es", "ja", "en"] as const;
export type Locale = (typeof locales)[number];
export type TranslationKey = keyof typeof en;
export const languageNames: Record<Locale, string> = {
  "pt-BR": "Português (Brasil)",
  es: "Español",
  ja: "日本語",
  en: "English",
};
