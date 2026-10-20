import { DEFAULT_ACCENT, knownAccent } from "./accents";

/* The web app manifest, built per request so an installed owe can carry the
   accent its owner picked (Chrome on Android re-reads the manifest about once
   a day and updates the installed icon; see app/manifest.webmanifest).

   Everything that is not "a valid, non-default accent with the feature on"
   gets BASE, which is the old static public/manifest.webmanifest field for
   field -- so the default lime, a missing or tampered cookie, the kill switch
   and any error all leave installed apps exactly as they were. The manifest
   URL, start_url and scope never change: Chrome identifies the installed app
   by them, and changing them would orphan existing installs. No `id` is added
   either, for the same reason -- it would only be safe if it resolved to the
   id Chrome already derived, and there is nothing to gain from betting on it. */

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

export type Manifest = typeof BASE_MANIFEST;

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
