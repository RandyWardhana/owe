import { useEffect } from "react";

import { useStore } from "@/lib/store";
import { applyAccentFavicon } from "@/lib/favicon";
import { ACCENT_COOKIE, knownAccent } from "@/lib/accents";

export function useAppliedAppearance(): void {
  const theme = useStore((s) => s.theme);
  const anim = useStore((s) => s.anim);
  const accent = useStore((s) => s.accent);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-anim", anim ? "on" : "off");
    root.style.setProperty("--accent", accent);
  }, [theme, anim, accent]);

  // The tab icon follows the accent too, on every page that applies the
  // appearance (the app, shared links, /landing).
  useEffect(() => {
    void applyAccentFavicon(accent);

    // The installed app's icon can only follow the accent if the server can
    // see it, and the manifest request carries cookies, not localStorage.
    // Only one of the six known accents is ever written.
    const known = knownAccent(accent);
    if (known) {
      document.cookie = `${ACCENT_COOKIE}=${known.slice(1)}; path=/; max-age=31536000; samesite=lax`;
    }
  }, [accent]);
}
