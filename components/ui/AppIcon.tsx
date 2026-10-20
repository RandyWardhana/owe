import { OWE_MARK_PATH } from "@/lib/brandMark";

/* The owe app icon drawn in place, in the current accent: the square takes
   --accent and the mark --on-accent, so it follows the accent picker and stays
   legible in both themes. public/icon.svg is fixed lime, which is right for
   the files a browser or launcher caches, but wrong inside the app, where the
   rest of the page has already changed colour. Same mark as the file: the path
   comes from lib/brandMark, which a test keeps in step with icon.svg. */
export default function AppIcon({ className, size }: { className?: string; size?: number }) {
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
