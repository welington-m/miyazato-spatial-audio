import { useId } from "react";
import { setLanguage, useI18n } from "../../i18n";
import { languageNames, locales, type Locale } from "../../i18n/types";
export default function LanguageSelector() {
  const { t, language } = useI18n();
  const id = useId();
  return (
    <div className="language-setting">
      <label htmlFor={id}>{t("settings.language")}</label>
      <select
        id={id}
        value={language}
        onChange={(e) => void setLanguage(e.target.value as Locale)}
      >
        {locales.map((locale) => (
          <option key={locale} value={locale} lang={locale}>
            {languageNames[locale]}
          </option>
        ))}
      </select>
      <p>{t("settings.languageNote")}</p>
    </div>
  );
}
