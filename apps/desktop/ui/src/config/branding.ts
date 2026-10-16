import tokens from "../../../../../assets/branding/brand/brand-tokens.json";
import { version } from "../../package.json";
const asset = (relative: string) =>
  `${import.meta.env.BASE_URL}branding/${relative}`;
export const branding = {
  appName: tokens.brand,
  shortName: "MSE",
  tagline: tokens.tagline,
  version,
  logo: {
    primary: asset(tokens.usage.transparent_logo),
    horizontal: asset(tokens.usage.horizontal_logo),
  },
  icons: {
    favicon: asset("icons/favicon.ico"),
    app64: asset("icons/mse-icon-64x64.png"),
    app256: asset("icons/mse-icon-256x256.png"),
  },
  splash: { primary: asset(tokens.usage.splash) },
  colors: tokens.primary_colors,
} as const;
