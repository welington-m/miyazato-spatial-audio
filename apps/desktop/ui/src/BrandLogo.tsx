import { branding } from "./config/branding";
export default function BrandLogo({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <img
      className={`official-logo ${className}`}
      src={compact ? branding.icons.app64 : branding.logo.primary}
      alt={branding.appName}
      width={compact ? 42 : 96}
      height={compact ? 42 : 96}
    />
  );
}
