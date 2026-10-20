import type { Manifest } from "../entities/pwa";
import { DEFAULT_ACCENT, knownAccent } from "./accents";

// Anything but a valid non-default accent with the feature on gets BASE_MANIFEST unchanged.
// Never change the manifest URL, start_url or scope, or add an `id`: Chrome identifies the
// installed app by them, and changing them would orphan existing installs.

export const BASE_MANIFEST = {
  name: "owe — scan · split · settle",
  short_name: "owe",
  description: "Scan a receipt, split it, settle up. Offline-first.",
  start_url: "/",
  scope: "/",
  display: "standalone",
  orientation: "portrait",
  background_color: "#fbfbf7",
  theme_color: "#9be52e",
  categories: ["finance", "utilities", "productivity"],
  icons: [
    { src: "/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};

export function buildManifest(cookieValue: string | null | undefined, enabled: boolean): Manifest {
  if (!enabled) return BASE_MANIFEST;
  const accent = knownAccent(cookieValue);
  if (!accent || accent === DEFAULT_ACCENT) return BASE_MANIFEST;
  const hex = accent.slice(1);
  return {
    ...BASE_MANIFEST,
    theme_color: accent,
    icons: [
      { src: `/pwa-icon/${hex}/192`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `/pwa-icon/${hex}/512`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `/pwa-icon/${hex}/maskable-512`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
