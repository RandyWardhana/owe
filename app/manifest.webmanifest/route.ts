import { cookies } from "next/headers";

import { ACCENT_COOKIE } from "@/lib/accents";
import { BASE_MANIFEST, buildManifest } from "@/lib/pwaManifest";

/* Served from the same URL the static public/manifest.webmanifest used --
   Chrome ties an installed app to its manifest's location, so moving it would
   strand every existing install. Built per request because the icons follow
   the accent cookie; see lib/pwaManifest.ts for every case that falls back to
   the original manifest.

   OWE_ACCENT_PWA_ICONS=off is the kill switch: set it and every device gets
   the original lime manifest again on its next check, no deploy of code. */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  let manifest = BASE_MANIFEST;
  try {
    const enabled = process.env.OWE_ACCENT_PWA_ICONS !== "off";
    const cookie = (await cookies()).get(ACCENT_COOKIE)?.value;
    manifest = buildManifest(cookie, enabled);
  } catch {
    manifest = BASE_MANIFEST;
  }
  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      // Per device (it depends on a cookie), and always rechecked: a cached
      // copy is exactly how an icon update silently never arrives.
      "Cache-Control": "private, no-cache",
      Vary: "Cookie",
    },
  });
}
