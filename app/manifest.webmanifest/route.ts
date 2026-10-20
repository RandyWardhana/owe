import { cookies } from "next/headers";

import { ACCENT_COOKIE } from "@/lib/accents";
import { BASE_MANIFEST, buildManifest } from "@/lib/pwaManifest";

/* Must stay at this URL: Chrome ties an installed app to its manifest's location.
   OWE_ACCENT_PWA_ICONS=off is the kill switch back to the original lime manifest. */
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
      // Per device and always rechecked: a cached copy silently blocks icon updates.
      "Cache-Control": "private, no-cache",
      Vary: "Cookie",
    },
  });
}
