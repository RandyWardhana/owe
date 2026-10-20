import { OWE_MARK_PATH } from "@/lib/brandMark";
import type { AppIconProps } from "@/entities/props/ui";

/* Drawn in place so it follows the accent; public/icon.svg stays fixed lime for
   browser and launcher caches. The path comes from lib/brandMark, which a test
   keeps in step with icon.svg. */
export default function AppIcon({ className, size }: AppIconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 512 512"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="512" height="512" rx="64" fill="var(--accent)" />
      <path d={OWE_MARK_PATH} fill="var(--on-accent)" />
    </svg>
  );
}
