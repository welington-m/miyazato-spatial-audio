# UI localization

Miyazato Spatial Engine supports exactly four frontend locales: `pt-BR`
(Português (Brasil)), `es` (Español), `ja` (日本語), and `en` (English).

## Resources and keys

Resources live in `apps/desktop/ui/src/i18n/locales/{locale}.json`.
Each file contains the same semantic keys, such as `nav.home`,
`settings.language`, and `help.bass.description`. Dotted keys are flat JSON
properties (`keySeparator: false`). There is one i18next instance, connected to
React with react-i18next in `src/i18n/index.ts`.

To add a string:

1. Add the same key to all four files and write a natural translation in each.
2. Use `const { t } = useI18n()` and `t("section.key")` in the component.
   `TranslationKey` is derived from the English resource for compile-time checking.
3. Keep interpolation names identical, for example `{{title}}` or `{{version}}`.
   Do not assemble translated sentences by concatenating fragments.
4. Run `npm run test` and `npm run build` from `apps/desktop/ui`.

The validation test checks key parity, nonempty values, and interpolation parity.
English is the fallback for missing translations. All resources are bundled, so
switching languages requires no network request. React escapes interpolated text.

## Runtime switching and persistence

The Language section in Settings changes language immediately, including menus,
accessible names, preset display labels, diagnostics, and already-open help.
`document.documentElement.lang` follows the active locale. No restart is needed.

The separate frontend preference is stored as `{ "language": "ja" }` under
`miyazato.ui.settings.v1` in localStorage, using the existing versioned Miyazato
key convention. It deliberately stays outside `miyazato.settings.v1` and native
`settings.save` payloads: choosing a language does not send IPC messages, change
an audio profile, or schedule a DSP update. Native settings files and contracts
remain unchanged. Restore defaults continues to reset audio/visual settings;
it does not erase the chosen language.

Startup restores a supported saved language first. Otherwise it checks browser
languages in preference order: `pt-*` maps to `pt-BR`, `es-*` to `es`, `ja-*`
to `ja`, and `en-*` to `en`. Unsupported languages fall back to English.
Malformed or inaccessible storage and failed locale detection do not block
startup. If persistence is unavailable, runtime switching still works for the
current session.

## Audio labels, help, and errors

`src/content/audioHelp.ts` maps stable help identifiers to translation namespaces.
Each help entry has `title`, `description`, `usage`, and `warning` keys in every
locale. The reusable HelpTooltip resolves them during rendering; a pinned popover
keeps its state when language changes and recomputes placement for the new text.
Planned/bypassed spatial features remain explicitly inactive in every language.
No processing or feature status is changed by localization.

`src/i18n/labels.ts` translates the display of built-in mode and preset names.
Their canonical identifiers, stored names, values, and IPC representation remain
unchanged. Saved custom profile names and Windows endpoint names are user/host
data and are displayed verbatim. Brand names, technical acronyms, channel codes,
and units such as DSP, WASAPI, HRTF, FFT, RMS, Hz, kHz, dB, and ms remain intact.
`Intl.NumberFormat` localizes display decimals; numeric input values and audio
parameters remain machine-readable numbers.

Known user-facing host errors are mapped to semantic keys in `src/i18n/errors.ts`
at presentation time. Unknown native errors show a localized summary and a
collapsible, localized “Technical details” label. The raw diagnostic text inside
that section is intentionally preserved, so no native error information is lost.
Internal log data and user/host-provided names are not translated.

## Layout and validation

Longer labels wrap in navigation, mode cards, sliders, preset tabs, and the footer
without shrinking fonts. Japanese system font fallbacks are included. Popovers
use natural height, a 340px preferred width, viewport size constraints, and the
existing flip/clamp positioning logic.

The Vitest/React Testing Library suite covers all locales and audio screens,
runtime and persisted language changes, detection/fallback, accessibility,
HTML language, helper updates, number formatting, key parity, and isolation from
native/audio settings. Real-browser validation also checks all seven screens
and tooltip bounds in all four languages at 1366×768, 1920×1080, 2560×1440,
and 3840×2160. Browser validation tools are temporary and are not application
dependencies.
